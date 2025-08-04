-- Ajouter les politiques RLS manquantes pour campaign_lists
-- Les utilisateurs doivent pouvoir gérer les associations campagne-listes de leur tenant

-- Politique pour INSERT
CREATE POLICY "Users can insert campaign lists for their tenant" 
ON public.campaign_lists 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM campaigns c 
    WHERE c.id = campaign_lists.campaign_id 
    AND c.tenant_id = (
      SELECT u.tenant_id 
      FROM users u 
      WHERE u.id = auth.uid()
    )
  )
);

-- Politique pour UPDATE  
CREATE POLICY "Users can update campaign lists for their tenant" 
ON public.campaign_lists 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM campaigns c 
    WHERE c.id = campaign_lists.campaign_id 
    AND c.tenant_id = (
      SELECT u.tenant_id 
      FROM users u 
      WHERE u.id = auth.uid()
    )
  )
);

-- Politique pour DELETE
CREATE POLICY "Users can delete campaign lists for their tenant" 
ON public.campaign_lists 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM campaigns c 
    WHERE c.id = campaign_lists.campaign_id 
    AND c.tenant_id = (
      SELECT u.tenant_id 
      FROM users u 
      WHERE u.id = auth.uid()
    )
  )
);