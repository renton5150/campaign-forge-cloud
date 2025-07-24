
-- Créer la table blacklist_item_lists pour associer les éléments blacklistés aux listes
CREATE TABLE public.blacklist_item_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blacklist_id UUID NOT NULL REFERENCES public.blacklists(id) ON DELETE CASCADE,
  blacklist_list_id UUID NOT NULL REFERENCES public.blacklist_lists(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  added_by UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE(blacklist_id, blacklist_list_id)
);

-- Activer RLS sur la table
ALTER TABLE public.blacklist_item_lists ENABLE ROW LEVEL SECURITY;

-- Politique pour les super admins
CREATE POLICY "Super admin can manage all blacklist item lists" 
  ON public.blacklist_item_lists 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
  );

-- Politique pour les utilisateurs tenant
CREATE POLICY "Users can manage their tenant blacklist item lists" 
  ON public.blacklist_item_lists 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.blacklists b
      WHERE b.id = blacklist_item_lists.blacklist_id
      AND b.tenant_id = (
        SELECT u.tenant_id FROM public.users u 
        WHERE u.id = auth.uid() AND u.tenant_id IS NOT NULL
      )
    )
  );

-- Index pour optimiser les performances
CREATE INDEX idx_blacklist_item_lists_blacklist_id ON public.blacklist_item_lists(blacklist_id);
CREATE INDEX idx_blacklist_item_lists_list_id ON public.blacklist_item_lists(blacklist_list_id);
