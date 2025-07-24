
-- Vérifier les données de l'utilisateur actuel
SELECT id, email, tenant_id, role FROM users WHERE email = 'contact@seventic.com';

-- Si l'utilisateur n'a pas de tenant_id, nous devons lui en créer un
-- D'abord, créer un tenant pour cet utilisateur
INSERT INTO tenants (company_name, domain, status)
VALUES ('Seventic', 'seventic.com', 'active');

-- Récupérer l'ID du tenant créé et mettre à jour l'utilisateur
UPDATE users 
SET tenant_id = (SELECT id FROM tenants WHERE company_name = 'Seventic' LIMIT 1)
WHERE email = 'contact@seventic.com';
