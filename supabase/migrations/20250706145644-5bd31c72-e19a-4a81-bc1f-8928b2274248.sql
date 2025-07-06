-- Queue d'envoi avec protection anti-doublon
CREATE TABLE public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_email TEXT NOT NULL,
  contact_name TEXT,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'processing', 'sent', 'failed')) DEFAULT 'pending',
  message_id TEXT UNIQUE, -- Protection critique anti-doublon
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(campaign_id, contact_email) -- Évite doublons par campagne
);

-- Logs pour debugging
CREATE TABLE public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_queue_id UUID REFERENCES public.email_queue(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  message TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour performance
CREATE INDEX idx_email_queue_status ON public.email_queue(status);
CREATE INDEX idx_email_queue_campaign ON public.email_queue(campaign_id);
CREATE INDEX idx_email_queue_scheduled ON public.email_queue(scheduled_for);

-- RLS Policies pour email_queue
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant email queue" ON public.email_queue
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = email_queue.campaign_id 
    AND c.tenant_id = (
      SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()
    )
  )
);

CREATE POLICY "Users can manage their tenant email queue" ON public.email_queue
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = email_queue.campaign_id 
    AND c.tenant_id = (
      SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()
    )
  )
);

-- RLS Policies pour email_logs
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant email logs" ON public.email_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.email_queue eq
    JOIN public.campaigns c ON c.id = eq.campaign_id
    WHERE eq.id = email_logs.email_queue_id 
    AND c.tenant_id = (
      SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create email logs for their tenant" ON public.email_logs
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.email_queue eq
    JOIN public.campaigns c ON c.id = eq.campaign_id
    WHERE eq.id = email_logs.email_queue_id 
    AND c.tenant_id = (
      SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()
    )
  )
);