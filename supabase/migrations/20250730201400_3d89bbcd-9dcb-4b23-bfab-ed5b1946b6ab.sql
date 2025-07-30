
-- Modifier la table sending_domains pour permettre tenant_id null (domaines système)
ALTER TABLE public.sending_domains 
ALTER COLUMN tenant_id DROP NOT NULL;

-- Modifier la fonction create_sending_domain pour gérer les domaines système
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
  -- Pour les super admins, permettre tenant_id null pour les domaines système
  IF p_tenant_id IS NULL THEN
    -- Vérifier si l'utilisateur est super_admin
    IF EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'super_admin'
    ) THEN
      v_final_tenant_id := NULL; -- Domaine système sans tenant
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Seuls les super admins peuvent créer des domaines système'
      );
    END IF;
  ELSE
    -- Vérifier que le tenant existe
    IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = p_tenant_id) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Tenant non trouvé'
      );
    END IF;
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
$function$;

-- Mettre à jour les politiques RLS pour gérer les domaines système (tenant_id null)
DROP POLICY IF EXISTS "Super admin can manage all sending domains" ON public.sending_domains;
DROP POLICY IF EXISTS "Users can manage their tenant sending domains" ON public.sending_domains;

-- Nouvelle politique pour les super admins (accès complet)
CREATE POLICY "Super admin can manage all sending domains" 
ON public.sending_domains 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Nouvelle politique pour les utilisateurs normaux (seulement leurs domaines tenant)
CREATE POLICY "Users can manage their tenant sending domains" 
ON public.sending_domains 
FOR ALL 
TO authenticated 
USING (
  tenant_id IS NOT NULL 
  AND tenant_id = (
    SELECT u.tenant_id 
    FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.tenant_id IS NOT NULL
  )
);
