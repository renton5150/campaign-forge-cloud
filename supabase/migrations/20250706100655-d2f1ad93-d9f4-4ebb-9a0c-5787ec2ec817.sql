-- Mettre à jour les politiques RLS pour campaigns pour autoriser les super_admin
DROP POLICY IF EXISTS "Users can manage their tenant campaigns" ON public.campaigns;

CREATE POLICY "Users can manage their tenant campaigns" ON public.campaigns
FOR ALL 
USING (
  -- Super admin peut tout gérer
  (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'))
  OR 
  -- Utilisateurs normaux peuvent gérer leurs campaigns de tenant
  (tenant_id = (SELECT u.tenant_id FROM users u WHERE u.id = auth.uid()))
)
WITH CHECK (
  -- Super admin peut tout créer
  (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'))
  OR 
  -- Utilisateurs normaux peuvent créer dans leur tenant
  (tenant_id = (SELECT u.tenant_id FROM users u WHERE u.id = auth.uid()))
);

-- Mettre à jour la politique de lecture pour campaigns
DROP POLICY IF EXISTS "Users can view their tenant campaigns" ON public.campaigns;

CREATE POLICY "Users can view their tenant campaigns" ON public.campaigns
FOR SELECT 
USING (
  -- Super admin peut tout voir
  (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'))
  OR
  -- Utilisateurs peuvent voir leurs campaigns de tenant
  (tenant_id = (SELECT u.tenant_id FROM users u WHERE u.id = auth.uid()))
);