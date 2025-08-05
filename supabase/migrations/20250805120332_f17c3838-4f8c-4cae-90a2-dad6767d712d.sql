-- Supprimer les anciennes politiques en conflit et recréer les bonnes
DROP POLICY IF EXISTS "Users can insert campaign lists for their tenant" ON public.campaign_lists;
DROP POLICY IF EXISTS "Users can update campaign lists for their tenant" ON public.campaign_lists;
DROP POLICY IF EXISTS "Users can delete campaign lists for their tenant" ON public.campaign_lists;

-- Recréer les politiques avec les bonnes conditions
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