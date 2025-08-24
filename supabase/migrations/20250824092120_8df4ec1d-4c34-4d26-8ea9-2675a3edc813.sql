-- Fix multi-tenant: create default tenant and attach orphaned rows
DO $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- 1) Create default tenant if it doesn't exist yet
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

  -- 2) Attach users without tenant to default tenant
  UPDATE public.users
  SET tenant_id = v_tenant_id
  WHERE tenant_id IS NULL;

  -- 3) Ensure SMTP servers point to a valid tenant (fallback to default)
  UPDATE public.smtp_servers
  SET tenant_id = v_tenant_id, updated_at = now()
  WHERE tenant_id IS NULL OR tenant_id NOT IN (SELECT id FROM public.tenants);

  -- 4) Fix campaigns without tenant
  UPDATE public.campaigns
  SET tenant_id = v_tenant_id, updated_at = now()
  WHERE tenant_id IS NULL;

  -- 5) Fix contact lists without tenant
  UPDATE public.contact_lists
  SET tenant_id = v_tenant_id, updated_at = now()
  WHERE tenant_id IS NULL;

  -- 6) Fix contacts without tenant
  UPDATE public.contacts
  SET tenant_id = v_tenant_id, updated_at = now()
  WHERE tenant_id IS NULL;
END $$;