
-- Mettre à jour les politiques RLS pour permettre aux super_admin de gérer tous les contacts
DROP POLICY IF EXISTS "Users can manage their tenant contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can view their tenant contacts" ON public.contacts;

-- Nouvelle politique pour permettre aux super_admin de tout gérer
CREATE POLICY "Super admin can manage all contacts" ON public.contacts
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Politique pour les utilisateurs normaux
CREATE POLICY "Users can manage their tenant contacts" ON public.contacts
FOR ALL USING (
  tenant_id = (
    SELECT u.tenant_id 
    FROM public.users u 
    WHERE u.id = auth.uid() AND u.tenant_id IS NOT NULL
  )
);

-- Politique de lecture pour tous (super_admin + utilisateurs normaux)
CREATE POLICY "Users can view contacts" ON public.contacts
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
  OR 
  tenant_id = (
    SELECT u.tenant_id 
    FROM public.users u 
    WHERE u.id = auth.uid() AND u.tenant_id IS NOT NULL
  )
);
