-- Fix multi-tenant architecture: Handle duplicates and assign default tenant
DO $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- 1) Remove the problematic constraint that prevents user updates
  ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_tenant_constraint;

  -- 2) Create default tenant if it doesn't exist yet
  INSERT INTO public.tenants (company_name, domain, status)
  SELECT 'Mon Entreprise', 'default.local', 'active'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tenants WHERE domain = 'default.local'
  );

  -- Retrieve the tenant id
  SELECT id INTO v_tenant_id
  FROM public.tenants 
  WHERE domain = 'default.local'
  LIMIT 1;

  -- Safety check
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Default tenant creation failed or tenant not found';
  END IF;

  -- 3) Attach users without tenant to default tenant
  UPDATE public.users
  SET tenant_id = v_tenant_id
  WHERE tenant_id IS NULL AND role <> 'super_admin';

  -- 4) Ensure SMTP servers point to a valid tenant (fallback to default)
  UPDATE public.smtp_servers
  SET tenant_id = v_tenant_id, updated_at = now()
  WHERE tenant_id IS NULL OR tenant_id NOT IN (SELECT id FROM public.tenants);

  -- 5) Fix campaigns without tenant
  UPDATE public.campaigns
  SET tenant_id = v_tenant_id, updated_at = now()
  WHERE tenant_id IS NULL;

  -- 6) Fix contact lists without tenant
  UPDATE public.contact_lists
  SET tenant_id = v_tenant_id, updated_at = now()
  WHERE tenant_id IS NULL;

  -- 7) Handle contacts duplicates before assignment
  -- First, delete orphaned contacts that would conflict with existing tenant contacts
  DELETE FROM public.contacts c1
  WHERE c1.tenant_id IS NULL 
    AND EXISTS (
      SELECT 1 FROM public.contacts c2 
      WHERE c2.tenant_id = v_tenant_id 
        AND c2.email = c1.email
    );

  -- Then assign remaining orphaned contacts to default tenant
  UPDATE public.contacts
  SET tenant_id = v_tenant_id, updated_at = now()
  WHERE tenant_id IS NULL;

  -- 8) Re-create the constraint with proper logic
  ALTER TABLE public.users ADD CONSTRAINT users_tenant_constraint 
    CHECK (
      (role = 'super_admin' AND tenant_id IS NULL) OR 
      (role <> 'super_admin' AND tenant_id IS NOT NULL)
    );

  RAISE NOTICE 'Multi-tenant architecture fixed: Default tenant created, duplicates handled, orphaned records assigned';
END $$;