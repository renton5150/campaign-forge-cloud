
-- Créer la table sending_domains
CREATE TABLE public.sending_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  domain_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verifying', 'verified', 'failed')),
  
  -- DKIM Configuration
  dkim_selector TEXT DEFAULT ('dk' || extract(epoch from now())::text),
  dkim_public_key TEXT,
  dkim_private_key TEXT,
  dkim_status TEXT DEFAULT 'pending' CHECK (dkim_status IN ('pending', 'verified', 'failed')),
  
  -- DNS Records générés automatiquement
  spf_record TEXT,
  dmarc_record TEXT,
  verification_token TEXT,
  
  -- Vérification
  dns_verified_at TIMESTAMP WITH TIME ZONE,
  last_verification_attempt TIMESTAMP WITH TIME ZONE,
  verification_errors JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(tenant_id, domain_name)
);

-- RLS Policies
ALTER TABLE public.sending_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their tenant sending domains" 
ON public.sending_domains FOR ALL 
USING (tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()));

CREATE POLICY "Super admin can manage all sending domains" 
ON public.sending_domains FOR ALL 
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

-- Fonction pour générer les clés DKIM
CREATE OR REPLACE FUNCTION public.generate_dkim_keypair()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_selector TEXT;
  v_public_key TEXT;
  v_private_key TEXT;
BEGIN
  -- Générer un sélecteur unique basé sur timestamp
  v_selector := 'dk' || extract(epoch from now())::bigint::text;
  
  -- Pour la démo, utiliser des clés factices (remplacer par vraie génération RSA 2048)
  v_private_key := '-----BEGIN RSA PRIVATE KEY-----' || chr(10) || 'MIIEpAIBAAKCAQEA...' || chr(10) || '-----END RSA PRIVATE KEY-----';
  v_public_key := 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...';
  
  RETURN jsonb_build_object(
    'selector', v_selector,
    'public_key', v_public_key,
    'private_key', v_private_key
  );
END;
$$;

-- Fonction de création domaine complète
CREATE OR REPLACE FUNCTION public.create_sending_domain(
  p_domain_name TEXT,
  p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_domain_id UUID;
  v_dkim_keys JSONB;
  v_verification_token TEXT;
  v_spf_record TEXT;
  v_dmarc_record TEXT;
BEGIN
  -- Générer les clés DKIM
  v_dkim_keys := public.generate_dkim_keypair();
  
  -- Générer token de vérification
  v_verification_token := 'lovable-verify-' || gen_random_uuid()::text;
  
  -- Générer records DNS
  v_spf_record := 'v=spf1 include:_spf.your-platform.com ~all';
  v_dmarc_record := 'v=DMARC1; p=quarantine; rua=mailto:dmarc@your-platform.com; pct=100';
  
  -- Insérer le domaine
  INSERT INTO public.sending_domains (
    tenant_id,
    domain_name,
    dkim_selector,
    dkim_public_key,
    dkim_private_key,
    spf_record,
    dmarc_record,
    verification_token
  ) VALUES (
    p_tenant_id,
    p_domain_name,
    v_dkim_keys->>'selector',
    v_dkim_keys->>'public_key',
    v_dkim_keys->>'private_key',
    v_spf_record,
    v_dmarc_record,
    v_verification_token
  ) RETURNING id INTO v_domain_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'domain_id', v_domain_id,
    'dns_records', jsonb_build_object(
      'dkim', jsonb_build_object(
        'host', (v_dkim_keys->>'selector') || '._domainkey.' || p_domain_name,
        'value', 'v=DKIM1; k=rsa; p=' || (v_dkim_keys->>'public_key')
      ),
      'spf', jsonb_build_object(
        'host', p_domain_name,
        'value', v_spf_record
      ),
      'dmarc', jsonb_build_object(
        'host', '_dmarc.' || p_domain_name,
        'value', v_dmarc_record
      ),
      'verification', jsonb_build_object(
        'host', '_lovable-verify.' || p_domain_name,
        'value', v_verification_token
      )
    )
  );
END;
$$;

-- Ajouter colonne sending_domain_id à smtp_servers
ALTER TABLE public.smtp_servers 
ADD COLUMN sending_domain_id UUID REFERENCES public.sending_domains(id);
