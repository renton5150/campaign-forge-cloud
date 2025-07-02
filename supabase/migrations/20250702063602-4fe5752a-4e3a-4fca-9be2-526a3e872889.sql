-- Permettre tenant_id NULL dans contact_lists pour les super_admin
ALTER TABLE contact_lists ALTER COLUMN tenant_id DROP NOT NULL;

-- Ajouter des logs pour diagnostiquer les problèmes de création de listes
-- Créer une fonction de debug pour les créations de listes
CREATE OR REPLACE FUNCTION public.debug_contact_list_creation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log les tentatives de création de listes
  RAISE LOG 'Contact list creation attempt: user_id=%, tenant_id=%, name=%', 
    auth.uid(), NEW.tenant_id, NEW.name;
  
  RETURN NEW;
END;
$$;

-- Ajouter le trigger de debug
CREATE TRIGGER debug_contact_list_creation_trigger
  BEFORE INSERT ON contact_lists
  FOR EACH ROW
  EXECUTE FUNCTION debug_contact_list_creation();