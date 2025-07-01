-- Corriger les politiques RLS pour les contact_lists pour permettre aux super_admin de créer des listes
-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can manage their tenant contact lists" ON contact_lists;
DROP POLICY IF EXISTS "Users can view their tenant contact lists" ON contact_lists;

-- Nouvelles politiques qui prennent en compte les super_admin
CREATE POLICY "Super admin can manage all contact lists" 
ON contact_lists 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
  )
);

CREATE POLICY "Users can manage their tenant contact lists" 
ON contact_lists 
FOR ALL 
USING (
  tenant_id = (
    SELECT u.tenant_id
    FROM users u
    WHERE u.id = auth.uid()
    AND u.tenant_id IS NOT NULL
  )
);

-- Politique de lecture séparée pour plus de clarté
CREATE POLICY "Users can view contact lists" 
ON contact_lists 
FOR SELECT 
USING (
  -- Super admin peut tout voir
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
  )
  OR
  -- Utilisateurs peuvent voir leurs listes tenant
  tenant_id = (
    SELECT u.tenant_id
    FROM users u
    WHERE u.id = auth.uid()
    AND u.tenant_id IS NOT NULL
  )
);