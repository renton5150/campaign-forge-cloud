
-- Permettre aux super_admin de créer des contacts sans tenant_id
ALTER TABLE public.contacts ALTER COLUMN tenant_id DROP NOT NULL;

-- Mettre à jour les politiques RLS pour être plus précises
DROP POLICY IF EXISTS "Users can manage their tenant contacts" ON public.contacts;

-- Politique pour les utilisateurs normaux (tenant_id requis)
CREATE POLICY "Users can manage their tenant contacts" ON public.contacts
FOR ALL USING (
  tenant_id IS NOT NULL AND tenant_id = (
    SELECT u.tenant_id 
    FROM public.users u 
    WHERE u.id = auth.uid() AND u.tenant_id IS NOT NULL
  )
);

-- Politique pour les super_admin (tenant_id peut être null)
CREATE POLICY "Super admin can manage contacts without tenant" ON public.contacts
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);
