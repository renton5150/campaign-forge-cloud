-- Fix multi-tenant: Remove all duplicates first, then assign tenant
DO $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- 1) Remove the problematic constraint
  ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_tenant_constraint;

  -- 2) Create default tenant if it doesn't exist
  INSERT INTO public.tenants (company_name, domain, status)
  SELECT 'Mon Entreprise', 'default.local', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE domain = 'default.local');

  SELECT id INTO v_tenant_id FROM public.tenants WHERE domain = 'default.local' LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Default tenant creation failed';
  END IF;

  -- 3) Clean duplicate contacts BEFORE assignment
  -- Keep only the oldest contact for each email and delete the rest
  WITH duplicate_contacts AS (
    SELECT id, email, 
           ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at ASC) as rn
    FROM public.contacts 
    WHERE tenant_id IS NULL
  )
  DELETE FROM public.contacts 
  WHERE id IN (
    SELECT id FROM duplicate_contacts WHERE rn > 1
  );

  -- 4) Now safely assign users to tenant
  UPDATE public.users SET tenant_id = v_tenant_id
  WHERE tenant_id IS NULL AND role <> 'super_admin';

  -- 5) Assign SMTP servers
  UPDATE public.smtp_servers SET tenant_id = v_tenant_id, updated_at = now()
  WHERE tenant_id IS NULL OR tenant_id NOT IN (SELECT id FROM public.tenants);

  -- 6) Assign campaigns
  UPDATE public.campaigns SET tenant_id = v_tenant_id, updated_at = now()
  WHERE tenant_id IS NULL;

  -- 7) Assign contact lists
  UPDATE public.contact_lists SET tenant_id = v_tenant_id, updated_at = now()
  WHERE tenant_id IS NULL;

  -- 8) Now assign remaining contacts (no more duplicates)
  UPDATE public.contacts SET tenant_id = v_tenant_id, updated_at = now()
  WHERE tenant_id IS NULL;

  -- 9) Re-create constraint
  ALTER TABLE public.users ADD CONSTRAINT users_tenant_constraint 
    CHECK (
      (role = 'super_admin' AND tenant_id IS NULL) OR 
      (role <> 'super_admin' AND tenant_id IS NOT NULL)
    );

  RAISE NOTICE 'Multi-tenant fixed: Duplicates removed, default tenant assigned to all orphaned records';
END $$;