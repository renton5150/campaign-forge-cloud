
-- Mettre à jour les politiques RLS pour contact_list_memberships
DROP POLICY IF EXISTS "Users can manage their tenant memberships" ON public.contact_list_memberships;

-- Politique pour les super_admin (peuvent tout gérer)
CREATE POLICY "Super admin can manage all memberships" ON public.contact_list_memberships
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Politique pour les utilisateurs normaux (seulement leur tenant)
CREATE POLICY "Users can manage their tenant memberships" ON public.contact_list_memberships
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.contact_lists cl
    JOIN public.users u ON u.tenant_id = cl.tenant_id
    WHERE cl.id = contact_list_memberships.list_id 
    AND u.id = auth.uid()
    AND u.tenant_id IS NOT NULL
  )
);
