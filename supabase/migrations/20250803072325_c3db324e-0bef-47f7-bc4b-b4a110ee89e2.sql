
-- Migration de correction pour restaurer le système d'email queue

-- 1. Vérifier et recréer la table email_queue si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.email_queue (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id uuid NOT NULL,
    contact_email text NOT NULL,
    contact_name text,
    subject text NOT NULL,
    html_content text NOT NULL,
    status text DEFAULT 'pending'::text,
    message_id text,
    retry_count integer DEFAULT 0,
    scheduled_for timestamp with time zone DEFAULT now(),
    sent_at timestamp with time zone,
    error_message text,
    error_code text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. Ajouter les colonnes manquantes si elles n'existent pas
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_queue' AND column_name = 'updated_at') THEN
        ALTER TABLE public.email_queue ADD COLUMN updated_at timestamp with time zone DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_queue' AND column_name = 'error_code') THEN
        ALTER TABLE public.email_queue ADD COLUMN error_code text;
    END IF;
END $$;

-- 3. Créer la fonction cleanup_stuck_emails manquante
CREATE OR REPLACE FUNCTION public.cleanup_stuck_emails()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  affected_count INTEGER;
BEGIN
  -- Nettoyer les emails bloqués en "processing" depuis plus de 1 heure
  UPDATE public.email_queue 
  SET status = 'failed',
      error_message = 'Email stuck in processing status - automatically failed',
      updated_at = now()
  WHERE status = 'processing' 
    AND updated_at < now() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  
  -- Log l'opération
  RAISE NOTICE 'Cleaned up % stuck emails', affected_count;
  
  RETURN affected_count;
END;
$function$;

-- 4. Vérifier et corriger les politiques RLS pour email_queue
DROP POLICY IF EXISTS "Users can manage their tenant email queue" ON public.email_queue;
DROP POLICY IF EXISTS "Users can view their tenant email queue" ON public.email_queue;

-- Recréer les politiques RLS correctes
CREATE POLICY "Users can manage their tenant email queue" 
ON public.email_queue 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns c 
    WHERE c.id = email_queue.campaign_id 
    AND c.tenant_id = (
      SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()
    )
  )
);

CREATE POLICY "Users can view their tenant email queue" 
ON public.email_queue 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns c 
    WHERE c.id = email_queue.campaign_id 
    AND c.tenant_id = (
      SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()
    )
  )
);

-- 5. Activer RLS sur email_queue
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- 6. Créer la table smtp_rate_limits si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.smtp_rate_limits (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    smtp_server_id uuid NOT NULL,
    emails_sent_hour integer DEFAULT 0,
    emails_sent_day integer DEFAULT 0,
    emails_sent_minute integer DEFAULT 0,
    last_reset_hour timestamp with time zone DEFAULT now(),
    last_reset_day timestamp with time zone DEFAULT now(),
    last_reset_minute timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 7. Activer RLS sur smtp_rate_limits
ALTER TABLE public.smtp_rate_limits ENABLE ROW LEVEL SECURITY;

-- 8. Créer les politiques pour smtp_rate_limits
DROP POLICY IF EXISTS "Users can manage their tenant smtp rate limits" ON public.smtp_rate_limits;
CREATE POLICY "Users can manage their tenant smtp rate limits" 
ON public.smtp_rate_limits 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.smtp_servers s 
    WHERE s.id = smtp_rate_limits.smtp_server_id 
    AND s.tenant_id = (
      SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()
    )
  )
);
