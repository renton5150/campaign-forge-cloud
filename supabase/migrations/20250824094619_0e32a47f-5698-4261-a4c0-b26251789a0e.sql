-- Correction multi-tenant: campagne orpheline et contraintes
DO $$
DECLARE
  v_tenant uuid := '5a4c9c60-98e9-41c2-a04a-59f95e13da61';
BEGIN
  -- 1) Assigner toutes les campagnes orphelines au tenant indiqué (inclut la campagne ciblée)
  UPDATE public.campaigns 
  SET tenant_id = v_tenant, updated_at = now()
  WHERE tenant_id IS NULL;

  -- 2) Assigner les utilisateurs orphelins au tenant indiqué
  UPDATE public.users 
  SET tenant_id = v_tenant
  WHERE tenant_id IS NULL;

  -- 3) Recréer la contrainte users_tenant_constraint (version tolérante pour super_admin)
  ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_tenant_constraint;
  ALTER TABLE public.users 
  ADD CONSTRAINT users_tenant_constraint 
  CHECK (
    (role = 'super_admin') OR 
    (role != 'super_admin' AND tenant_id IS NOT NULL)
  );

  -- 4) Ajouter contrainte: toutes les campagnes doivent avoir un tenant
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'campaigns_must_have_tenant'
  ) THEN
    ALTER TABLE public.campaigns 
    ADD CONSTRAINT campaigns_must_have_tenant 
    CHECK (tenant_id IS NOT NULL);
  END IF;
END $$;