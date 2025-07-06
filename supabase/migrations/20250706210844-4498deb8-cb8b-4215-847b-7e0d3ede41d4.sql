
-- Supprimer la politique existante qui cause le problème
DROP POLICY IF EXISTS "Users can manage their tenant SMTP servers" ON public.smtp_servers;

-- Créer une nouvelle politique plus permissive pour l'insertion
CREATE POLICY "smtp_servers_insert_policy" 
ON public.smtp_servers 
FOR INSERT 
WITH CHECK (
  -- Super admin peut créer pour n'importe quel tenant
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  OR 
  -- Utilisateur normal ne peut créer que pour son tenant
  (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()) AND (SELECT tenant_id FROM public.users WHERE id = auth.uid()) IS NOT NULL)
);

-- Politique pour la lecture
CREATE POLICY "smtp_servers_select_policy" 
ON public.smtp_servers 
FOR SELECT 
USING (
  -- Super admin voit tout
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  OR 
  -- Utilisateur normal voit seulement son tenant
  tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
);

-- Politique pour la mise à jour
CREATE POLICY "smtp_servers_update_policy" 
ON public.smtp_servers 
FOR UPDATE 
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  OR 
  tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
);

-- Politique pour la suppression
CREATE POLICY "smtp_servers_delete_policy" 
ON public.smtp_servers 
FOR DELETE 
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  OR 
  tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
);
