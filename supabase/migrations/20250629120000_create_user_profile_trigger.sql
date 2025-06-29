
-- Créer un trigger pour automatiquement créer un profil utilisateur
-- quand un utilisateur s'inscrit via Supabase Auth

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'tenant_sdr'::user_role,
    NULL -- sera assigné plus tard par un admin
  );
  RETURN NEW;
END;
$$;

-- Créer le trigger qui s'exécute après l'insertion d'un nouvel utilisateur dans auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
