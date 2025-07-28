
-- Créer la fonction manquante generate_unsubscribe_token
CREATE OR REPLACE FUNCTION public.generate_unsubscribe_token(p_email text, p_tenant_id uuid, p_campaign_id uuid DEFAULT NULL::uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_token TEXT;
BEGIN
  -- Générer un token unique avec timestamp et hash
  v_token := encode(
    digest(
      p_email || 
      p_tenant_id::text || 
      COALESCE(p_campaign_id::text, '') || 
      extract(epoch from now())::text || 
      gen_random_uuid()::text, 
      'sha256'
    ), 
    'hex'
  );
  
  RETURN v_token;
END;
$function$
