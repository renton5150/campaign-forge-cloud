
-- Mise à jour des politiques RLS pour permettre aux super_admin de gérer les blacklists
DROP POLICY IF EXISTS "Users can manage their tenant blacklists" ON public.blacklists;

-- Politique pour permettre aux super_admin de voir toutes les blacklists
CREATE POLICY "Super admin can view all blacklists" ON public.blacklists
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Politique pour permettre aux super_admin de gérer toutes les blacklists
CREATE POLICY "Super admin can manage all blacklists" ON public.blacklists
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Politique pour permettre aux utilisateurs normaux de gérer les blacklists de leur tenant
CREATE POLICY "Users can manage their tenant blacklists" ON public.blacklists
FOR ALL
USING (
  tenant_id = (
    SELECT u.tenant_id FROM public.users u 
    WHERE u.id = auth.uid() AND u.tenant_id IS NOT NULL
  )
)
WITH CHECK (
  tenant_id = (
    SELECT u.tenant_id FROM public.users u 
    WHERE u.id = auth.uid() AND u.tenant_id IS NOT NULL
  )
);
