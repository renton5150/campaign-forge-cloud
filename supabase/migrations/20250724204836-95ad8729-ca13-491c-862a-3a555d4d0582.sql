
-- Modifier la table blacklists pour permettre tenant_id null pour les super_admin
ALTER TABLE public.blacklists ALTER COLUMN tenant_id DROP NOT NULL;

-- Ajouter un commentaire pour documenter le changement
COMMENT ON COLUMN public.blacklists.tenant_id IS 'Tenant ID - null pour les blacklists globales des super_admin';
