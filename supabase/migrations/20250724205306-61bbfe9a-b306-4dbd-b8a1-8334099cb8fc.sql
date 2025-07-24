
-- Créer la table pour les listes de blacklist
CREATE TABLE public.blacklist_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NULL, -- null pour les super_admin
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('email', 'domain', 'mixed')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ajouter une colonne pour lier les blacklists aux listes
ALTER TABLE public.blacklists ADD COLUMN blacklist_list_id UUID;

-- Créer les index pour les performances
CREATE INDEX idx_blacklist_lists_tenant_id ON public.blacklist_lists(tenant_id);
CREATE INDEX idx_blacklist_lists_type ON public.blacklist_lists(type);
CREATE INDEX idx_blacklists_list_id ON public.blacklists(blacklist_list_id);

-- Activer RLS sur la nouvelle table
ALTER TABLE public.blacklist_lists ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour les listes de blacklist
CREATE POLICY "Super admin can manage all blacklist lists"
  ON public.blacklist_lists
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

CREATE POLICY "Users can manage their tenant blacklist lists"
  ON public.blacklist_lists
  FOR ALL
  USING (tenant_id = (
    SELECT u.tenant_id 
    FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.tenant_id IS NOT NULL
  ))
  WITH CHECK (tenant_id = (
    SELECT u.tenant_id 
    FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.tenant_id IS NOT NULL
  ));

-- Trigger pour updated_at
CREATE TRIGGER update_blacklist_lists_updated_at
  BEFORE UPDATE ON public.blacklist_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Commenter les nouvelles colonnes
COMMENT ON TABLE public.blacklist_lists IS 'Listes de blacklist pour organiser les emails et domaines bloqués';
COMMENT ON COLUMN public.blacklist_lists.tenant_id IS 'Tenant ID - null pour les listes globales des super_admin';
COMMENT ON COLUMN public.blacklist_lists.type IS 'Type de liste: email, domain, ou mixed';
COMMENT ON COLUMN public.blacklists.blacklist_list_id IS 'ID de la liste de blacklist (optionnel)';
