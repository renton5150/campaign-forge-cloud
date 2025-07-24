
-- Créer une table de liaison pour les relations many-to-many entre blacklists et listes
CREATE TABLE public.blacklist_item_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blacklist_id UUID NOT NULL,
  blacklist_list_id UUID NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  added_by UUID NOT NULL,
  UNIQUE(blacklist_id, blacklist_list_id)
);

-- Créer les index pour les performances
CREATE INDEX idx_blacklist_item_lists_blacklist_id ON public.blacklist_item_lists(blacklist_id);
CREATE INDEX idx_blacklist_item_lists_list_id ON public.blacklist_item_lists(blacklist_list_id);

-- Activer RLS sur la nouvelle table
ALTER TABLE public.blacklist_item_lists ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour la table de liaison
CREATE POLICY "Super admin can manage all blacklist item lists"
  ON public.blacklist_item_lists
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
  ));

CREATE POLICY "Users can manage their tenant blacklist item lists"
  ON public.blacklist_item_lists
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.blacklists b
    WHERE b.id = blacklist_item_lists.blacklist_id
    AND (
      b.tenant_id = (
        SELECT u.tenant_id 
        FROM public.users u 
        WHERE u.id = auth.uid() 
        AND u.tenant_id IS NOT NULL
      )
      OR (
        b.tenant_id IS NULL 
        AND EXISTS (
          SELECT 1 FROM public.users 
          WHERE users.id = auth.uid() 
          AND users.role = 'super_admin'
        )
      )
    )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.blacklists b
    WHERE b.id = blacklist_item_lists.blacklist_id
    AND (
      b.tenant_id = (
        SELECT u.tenant_id 
        FROM public.users u 
        WHERE u.id = auth.uid() 
        AND u.tenant_id IS NOT NULL
      )
      OR (
        b.tenant_id IS NULL 
        AND EXISTS (
          SELECT 1 FROM public.users 
          WHERE users.id = auth.uid() 
          AND users.role = 'super_admin'
        )
      )
    )
  ));

-- Supprimer l'ancienne colonne blacklist_list_id de la table blacklists
ALTER TABLE public.blacklists DROP COLUMN IF EXISTS blacklist_list_id;

-- Commenter la nouvelle table
COMMENT ON TABLE public.blacklist_item_lists IS 'Table de liaison pour associer des éléments de blacklist à plusieurs listes';
COMMENT ON COLUMN public.blacklist_item_lists.blacklist_id IS 'ID de l\'élément de blacklist';
COMMENT ON COLUMN public.blacklist_item_lists.blacklist_list_id IS 'ID de la liste de blacklist';
