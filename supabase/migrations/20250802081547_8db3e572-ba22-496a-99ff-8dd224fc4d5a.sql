
-- Table principale de la queue d'envoi
CREATE TABLE public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  smtp_server_id UUID NOT NULL REFERENCES public.smtp_servers(id),
  
  -- Données de l'email
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  content_html TEXT NOT NULL,
  content_text TEXT,
  
  -- Statuts et tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'bounced')),
  message_id TEXT UNIQUE, -- Format: campaign_id-contact_id-timestamp
  priority INTEGER DEFAULT 5, -- 1=highest, 10=lowest
  
  -- Retry logic
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  
  -- Rate limiting
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Erreurs
  error_message TEXT,
  error_code TEXT,
  smtp_response TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour performance
CREATE INDEX idx_email_queue_status ON public.email_queue(status);
CREATE INDEX idx_email_queue_scheduled ON public.email_queue(scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_email_queue_retry ON public.email_queue(next_retry_at) WHERE status = 'failed';
CREATE INDEX idx_email_queue_tenant ON public.email_queue(tenant_id);
CREATE INDEX idx_email_queue_campaign ON public.email_queue(campaign_id);

-- Table pour rate limiting par serveur
CREATE TABLE public.smtp_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  smtp_server_id UUID NOT NULL REFERENCES public.smtp_servers(id) ON DELETE CASCADE,
  emails_sent_hour INTEGER DEFAULT 0,
  emails_sent_day INTEGER DEFAULT 0,
  last_reset_hour TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_reset_day TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(smtp_server_id)
);

-- RLS Policies
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smtp_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their tenant email queue" 
ON public.email_queue FOR ALL 
USING (tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()));

CREATE POLICY "Users can view their tenant smtp rates" 
ON public.smtp_rate_limits FOR SELECT 
USING (smtp_server_id IN (SELECT id FROM public.smtp_servers WHERE tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid())));

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_email_queue_updated_at 
    BEFORE UPDATE ON public.email_queue 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour ajouter une campagne à la queue
CREATE OR REPLACE FUNCTION public.queue_campaign_for_sending(
  p_campaign_id UUID,
  p_contact_list_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_campaign campaigns%ROWTYPE;
  v_contact contacts%ROWTYPE;
  v_message_id TEXT;
  v_queued_count INTEGER := 0;
  v_duplicate_count INTEGER := 0;
  v_smtp_server_id UUID;
BEGIN
  -- Récupérer la campagne
  SELECT * INTO v_campaign FROM public.campaigns WHERE id = p_campaign_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;
  
  -- Récupérer le premier serveur SMTP actif pour ce tenant
  SELECT id INTO v_smtp_server_id 
  FROM public.smtp_servers 
  WHERE tenant_id = v_campaign.tenant_id 
  AND is_active = true 
  LIMIT 1;
  
  IF v_smtp_server_id IS NULL THEN
    RAISE EXCEPTION 'No active SMTP server found for this tenant';
  END IF;
  
  -- Pour chaque liste de contacts
  FOR v_contact IN 
    SELECT DISTINCT c.* 
    FROM public.contacts c
    JOIN public.contact_list_memberships clm ON c.id = clm.contact_id
    WHERE clm.list_id = ANY(p_contact_list_ids)
    AND c.status = 'active'
    AND c.tenant_id = v_campaign.tenant_id
  LOOP
    -- Générer message_id unique avec timestamp
    v_message_id := p_campaign_id::text || '-' || v_contact.id::text || '-' || extract(epoch from now())::bigint::text;
    
    -- Vérifier si pas déjà en queue (protection anti-doublon)
    IF NOT EXISTS (
      SELECT 1 FROM public.email_queue 
      WHERE campaign_id = p_campaign_id 
      AND contact_id = v_contact.id
      AND status IN ('pending', 'processing', 'sent')
    ) THEN
      -- Ajouter à la queue
      INSERT INTO public.email_queue (
        campaign_id,
        contact_id,
        tenant_id,
        smtp_server_id,
        recipient_email,
        recipient_name,
        subject,
        content_html,
        message_id,
        scheduled_at
      ) VALUES (
        p_campaign_id,
        v_contact.id,
        v_campaign.tenant_id,
        v_smtp_server_id,
        v_contact.email,
        COALESCE(v_contact.first_name || ' ' || v_contact.last_name, v_contact.email),
        v_campaign.subject,
        v_campaign.html_content,
        v_message_id,
        COALESCE(v_campaign.scheduled_at, now())
      );
      
      v_queued_count := v_queued_count + 1;
    ELSE
      v_duplicate_count := v_duplicate_count + 1;
    END IF;
  END LOOP;
  
  -- Mettre à jour le statut de campagne
  UPDATE public.campaigns 
  SET status = 'sending', updated_at = now()
  WHERE id = p_campaign_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'queued_emails', v_queued_count,
    'duplicates_skipped', v_duplicate_count,
    'message', 'Campagne mise en queue - ' || v_queued_count || ' emails à envoyer'
  );
END;
$$;

-- Fonction pour récupérer les emails à envoyer (worker)
CREATE OR REPLACE FUNCTION public.get_emails_to_send(
  p_limit INTEGER DEFAULT 10,
  p_smtp_server_id UUID DEFAULT NULL
)
RETURNS TABLE (
  queue_id UUID,
  campaign_id UUID,
  recipient_email TEXT,
  recipient_name TEXT,
  subject TEXT,
  content_html TEXT,
  smtp_server_id UUID,
  message_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Marquer les emails comme 'processing' et les retourner
  RETURN QUERY
  UPDATE public.email_queue eq
  SET 
    status = 'processing',
    updated_at = now()
  WHERE eq.id IN (
    SELECT eq2.id
    FROM public.email_queue eq2
    WHERE eq2.status = 'pending'
    AND eq2.scheduled_at <= now()
    AND (p_smtp_server_id IS NULL OR eq2.smtp_server_id = p_smtp_server_id)
    ORDER BY eq2.priority ASC, eq2.created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING 
    eq.id,
    eq.campaign_id,
    eq.recipient_email,
    eq.recipient_name,
    eq.subject,
    eq.content_html,
    eq.smtp_server_id,
    eq.message_id;
END;
$$;

-- Fonction pour marquer un email comme envoyé
CREATE OR REPLACE FUNCTION public.mark_email_sent(
  p_queue_id UUID,
  p_smtp_response TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.email_queue
  SET 
    status = 'sent',
    sent_at = now(),
    smtp_response = p_smtp_response,
    updated_at = now()
  WHERE id = p_queue_id;
  
  -- Incrémenter les compteurs de rate limiting
  INSERT INTO public.smtp_rate_limits (smtp_server_id, emails_sent_hour, emails_sent_day)
  SELECT smtp_server_id, 1, 1
  FROM public.email_queue
  WHERE id = p_queue_id
  ON CONFLICT (smtp_server_id) DO UPDATE SET
    emails_sent_hour = CASE 
      WHEN smtp_rate_limits.last_reset_hour < now() - interval '1 hour' 
      THEN 1 
      ELSE smtp_rate_limits.emails_sent_hour + 1 
    END,
    emails_sent_day = CASE 
      WHEN smtp_rate_limits.last_reset_day < now() - interval '1 day' 
      THEN 1 
      ELSE smtp_rate_limits.emails_sent_day + 1 
    END,
    last_reset_hour = CASE 
      WHEN smtp_rate_limits.last_reset_hour < now() - interval '1 hour' 
      THEN now() 
      ELSE smtp_rate_limits.last_reset_hour 
    END,
    last_reset_day = CASE 
      WHEN smtp_rate_limits.last_reset_day < now() - interval '1 day' 
      THEN now() 
      ELSE smtp_rate_limits.last_reset_day 
    END;
END;
$$;

-- Fonction pour marquer un email comme échoué avec retry
CREATE OR REPLACE FUNCTION public.mark_email_failed(
  p_queue_id UUID,
  p_error_message TEXT,
  p_error_code TEXT DEFAULT NULL,
  p_smtp_response TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_retry_count INTEGER;
  v_max_retries INTEGER;
  v_next_retry TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Récupérer les infos actuelles
  SELECT retry_count, max_retries INTO v_retry_count, v_max_retries
  FROM public.email_queue WHERE id = p_queue_id;
  
  v_retry_count := v_retry_count + 1;
  
  -- Calculer le prochain retry avec backoff exponentiel
  v_next_retry := now() + (interval '1 minute' * power(2, v_retry_count));
  
  IF v_retry_count >= v_max_retries THEN
    -- Max retries atteint, marquer comme failed définitivement
    UPDATE public.email_queue
    SET 
      status = 'failed',
      retry_count = v_retry_count,
      error_message = p_error_message,
      error_code = p_error_code,
      smtp_response = p_smtp_response,
      updated_at = now()
    WHERE id = p_queue_id;
  ELSE
    -- Programmer un retry
    UPDATE public.email_queue
    SET 
      status = 'pending',
      retry_count = v_retry_count,
      next_retry_at = v_next_retry,
      scheduled_at = v_next_retry,
      error_message = p_error_message,
      error_code = p_error_code,
      smtp_response = p_smtp_response,
      updated_at = now()
    WHERE id = p_queue_id;
  END IF;
END;
$$;

-- FONCTION CRITIQUE : Nettoyer les emails bloqués en "processing"
CREATE OR REPLACE FUNCTION public.cleanup_stuck_emails()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cleaned_count INTEGER;
BEGIN
  -- Remettre en "pending" les emails "processing" depuis plus de 5 minutes
  -- (protection contre les SMTP lents qui ne répondent pas)
  UPDATE public.email_queue
  SET 
    status = 'pending',
    scheduled_at = now() + interval '5 minutes', -- Délai avant retry
    error_message = 'Récupéré après timeout SMTP',
    error_code = 'SMTP_TIMEOUT_RECOVERY',
    updated_at = now()
  WHERE status = 'processing'
  AND updated_at < now() - interval '5 minutes';
  
  GET DIAGNOSTICS v_cleaned_count = ROW_COUNT;
  
  IF v_cleaned_count > 0 THEN
    RAISE NOTICE 'Récupéré % emails bloqués en processing', v_cleaned_count;
  END IF;
  
  RETURN v_cleaned_count;
END;
$$;
