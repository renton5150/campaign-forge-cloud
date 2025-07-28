
-- 1. Génération d'un token de test
SELECT create_unsubscribe_token(
  'test@example.com', 
  (SELECT id FROM tenants LIMIT 1), 
  NULL
) as generated_token;

-- 2. Vérification du token créé
SELECT * FROM unsubscribe_tokens 
WHERE email = 'test@example.com'
ORDER BY created_at DESC;

-- 3. Vérification des fonctions disponibles
SELECT proname, prosrc FROM pg_proc 
WHERE proname IN ('create_unsubscribe_token', 'process_unsubscription', 'generate_unsubscribe_token');

-- 4. Test de création d'un contact pour le test
INSERT INTO contacts (email, first_name, last_name, tenant_id, created_by, status)
VALUES (
  'test@example.com',
  'Test',
  'User',
  (SELECT id FROM tenants LIMIT 1),
  (SELECT id FROM users LIMIT 1),
  'active'
) ON CONFLICT (email) DO NOTHING;

-- 5. Vérification de la structure de la table unsubscriptions
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'unsubscriptions' AND table_schema = 'public'
ORDER BY ordinal_position;
