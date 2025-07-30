
-- Modifier la fonction create_sending_domain pour accepter tenant_id null pour les super admins
CREATE OR REPLACE FUNCTION public.create_sending_domain(p_domain_name text, p_tenant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_domain_id UUID;
  v_dkim_keys JSONB;
  v_verification_token TEXT;
  v_spf_record TEXT;
  v_dmarc_record TEXT;
  v_final_tenant_id UUID;
BEGIN
  -- Pour les super admins, utiliser l'ID utilisateur comme tenant_id si p_tenant_id est null
  IF p_tenant_id IS NULL THEN
    -- Vérifier si l'utilisateur est super_admin
    IF EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'super_admin'
    ) THEN
      v_final_tenant_id := auth.uid(); -- Utiliser l'ID utilisateur comme tenant_id
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Tenant ID requis pour les utilisateurs non-admin'
      );
    END IF;
  ELSE
    v_final_tenant_id := p_tenant_id;
  END IF;
  
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
    v_final_tenant_id,
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
$function$
