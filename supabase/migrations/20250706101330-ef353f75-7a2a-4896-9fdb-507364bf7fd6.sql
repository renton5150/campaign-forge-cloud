-- Corriger TOUTES les politiques RLS pour utiliser la table users au lieu de auth.users

-- 1. Corriger les politiques campaigns
DROP POLICY IF EXISTS "Users can manage their tenant campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can view their tenant campaigns" ON public.campaigns;

CREATE POLICY "Users can manage their tenant campaigns" ON public.campaigns
FOR ALL 
USING (
  -- Super admin peut tout gérer
  (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
  OR 
  -- Utilisateurs normaux peuvent gérer leurs campaigns de tenant
  (tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()))
)
WITH CHECK (
  -- Super admin peut tout créer
  (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
  OR 
  -- Utilisateurs normaux peuvent créer dans leur tenant
  (tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()))
);

CREATE POLICY "Users can view their tenant campaigns" ON public.campaigns
FOR SELECT 
USING (
  -- Super admin peut tout voir
  (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
  OR
  -- Utilisateurs peuvent voir leurs campaigns de tenant
  (tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()))
);

-- 2. Corriger les politiques email_templates 
DROP POLICY IF EXISTS "Users can manage their tenant templates" ON public.email_templates;
DROP POLICY IF EXISTS "Users can view templates" ON public.email_templates;

CREATE POLICY "Users can manage their tenant templates" ON public.email_templates
FOR ALL 
USING (
  -- Super admin peut tout gérer
  (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
  OR 
  -- Utilisateurs normaux peuvent gérer leurs templates de tenant
  (tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()))
)
WITH CHECK (
  -- Super admin peut tout créer
  (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
  OR 
  -- Utilisateurs normaux peuvent créer dans leur tenant
  (tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()))
);

CREATE POLICY "Users can view templates" ON public.email_templates
FOR SELECT 
USING (
  -- Templates système visibles par tous
  (is_system_template = true)
  OR
  -- Super admin peut tout voir
  (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
  OR
  -- Utilisateurs peuvent voir leurs templates de tenant
  (tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()))
);

-- 3. Corriger les politiques contact_lists
DROP POLICY IF EXISTS "Super admin can manage all contact lists" ON public.contact_lists;
DROP POLICY IF EXISTS "Users can view contact lists" ON public.contact_lists;

CREATE POLICY "Super admin can manage all contact lists" ON public.contact_lists
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  )
);

CREATE POLICY "Users can view contact lists" ON public.contact_lists
FOR SELECT 
USING (
  -- Super admin peut tout voir
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  )
  OR
  -- Utilisateurs peuvent voir leurs listes tenant
  tenant_id = (
    SELECT u.tenant_id
    FROM public.users u
    WHERE u.id = auth.uid()
    AND u.tenant_id IS NOT NULL
  )
);

-- 4. Corriger les autres politiques qui utilisent auth.users
DROP POLICY IF EXISTS "Super admin can view all tenants" ON public.tenants;
DROP POLICY IF EXISTS "Super admin can manage tenants" ON public.tenants;

CREATE POLICY "Super admin can view all tenants" ON public.tenants
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Super admin can manage tenants" ON public.tenants
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- 5. Corriger les politiques domains
DROP POLICY IF EXISTS "Super admin can view all domains" ON public.domains;
DROP POLICY IF EXISTS "Super admin can manage all domains" ON public.domains;
DROP POLICY IF EXISTS "Users can view tenant domains" ON public.domains;
DROP POLICY IF EXISTS "Tenant users can manage tenant domains" ON public.domains;

CREATE POLICY "Super admin can view all domains" ON public.domains
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Super admin can manage all domains" ON public.domains
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Users can view tenant domains" ON public.domains
FOR SELECT USING (
  tenant_id = (
    SELECT u.tenant_id FROM public.users u 
    WHERE u.id = auth.uid()
  )
);

CREATE POLICY "Tenant users can manage tenant domains" ON public.domains
FOR ALL USING (
  tenant_id = (
    SELECT u.tenant_id FROM public.users u 
    WHERE u.id = auth.uid() AND u.role IN ('tenant_admin', 'tenant_growth')
  )
);