-- Mettre à jour la politique RLS pour email_templates pour autoriser les super_admin
DROP POLICY IF EXISTS "Users can manage their tenant templates" ON public.email_templates;

CREATE POLICY "Users can manage their tenant templates" ON public.email_templates
FOR ALL 
USING (
  -- Super admin peut tout gérer
  (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'))
  OR 
  -- Utilisateurs normaux peuvent gérer leurs templates de tenant
  (tenant_id = (SELECT u.tenant_id FROM users u WHERE u.id = auth.uid()))
)
WITH CHECK (
  -- Super admin peut tout créer
  (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'))
  OR 
  -- Utilisateurs normaux peuvent créer dans leur tenant
  (tenant_id = (SELECT u.tenant_id FROM users u WHERE u.id = auth.uid()))
);

-- Mettre à jour la politique de lecture pour email_templates  
DROP POLICY IF EXISTS "Users can view templates" ON public.email_templates;

CREATE POLICY "Users can view templates" ON public.email_templates
FOR SELECT 
USING (
  -- Templates système visibles par tous
  (is_system_template = true)
  OR
  -- Super admin peut tout voir
  (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'))
  OR
  -- Utilisateurs peuvent voir leurs templates de tenant
  (tenant_id = (SELECT u.tenant_id FROM users u WHERE u.id = auth.uid()))
);