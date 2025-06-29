
-- Créer les tables pour le système de permissions avancé

-- Table des modules/ressources de l'application
CREATE TABLE public.modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des permissions (actions possibles sur les modules)
CREATE TABLE public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'read', 'write', 'delete', 'admin'
    label TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(module_id, action)
);

-- Table des rôles personnalisés par tenant
CREATE TABLE public.custom_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    is_system_role BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Créer des index uniques séparés pour gérer l'unicité
CREATE UNIQUE INDEX custom_roles_tenant_name_unique 
    ON public.custom_roles (tenant_id, name) 
    WHERE tenant_id IS NOT NULL;

CREATE UNIQUE INDEX custom_roles_system_name_unique 
    ON public.custom_roles (name) 
    WHERE tenant_id IS NULL AND is_system_role = true;

-- Table de liaison rôles-permissions
CREATE TABLE public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    granted_by UUID REFERENCES public.users(id),
    UNIQUE(role_id, permission_id)
);

-- Table d'attribution des rôles aux utilisateurs
CREATE TABLE public.user_role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    assigned_by UUID REFERENCES public.users(id),
    UNIQUE(user_id, role_id)
);

-- Table d'audit des changements de permissions
CREATE TABLE public.permission_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    role_id UUID REFERENCES public.custom_roles(id),
    permission_id UUID REFERENCES public.permissions(id),
    action TEXT NOT NULL, -- 'granted', 'revoked', 'role_created', 'role_deleted'
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.users(id)
);

-- Insérer les modules de base
INSERT INTO public.modules (name, label, description) VALUES
('campaigns', 'Campagnes', 'Gestion des campagnes marketing'),
('contacts', 'Contacts', 'Gestion des contacts et listes'),
('analytics', 'Analytics', 'Consultation des statistiques et rapports'),
('domains', 'Domaines', 'Gestion des domaines et DNS'),
('users', 'Utilisateurs', 'Gestion des utilisateurs et équipes'),
('settings', 'Paramètres', 'Configuration du tenant et préférences');

-- Insérer les permissions pour chaque module
INSERT INTO public.permissions (module_id, action, label, description)
SELECT 
    m.id,
    unnest(ARRAY['read', 'write', 'delete', 'admin']) as action,
    unnest(ARRAY['Lecture', 'Écriture', 'Suppression', 'Administration']) as label,
    unnest(ARRAY[
        'Consulter les ' || m.label,
        'Créer et modifier les ' || m.label,
        'Supprimer les ' || m.label,
        'Administration complète des ' || m.label
    ]) as description
FROM public.modules m;

-- Créer seulement le rôle système super_admin
INSERT INTO public.custom_roles (name, label, description, is_system_role, tenant_id) VALUES
('super_admin', 'Super Administrateur', 'Accès complet à toute la plateforme', true, NULL);

-- Activer RLS sur toutes les nouvelles tables
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour modules et permissions (lecture pour tous les authentifiés)
CREATE POLICY "Authenticated can view modules" ON public.modules
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can view permissions" ON public.permissions
    FOR SELECT TO authenticated USING (true);

-- RLS Policies pour custom_roles
CREATE POLICY "Super admin can view all roles" ON public.custom_roles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Users can view their tenant roles" ON public.custom_roles
    FOR SELECT USING (
        tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid())
        OR is_system_role = true
    );

CREATE POLICY "Super admin can manage all roles" ON public.custom_roles
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Tenant admin can manage tenant roles" ON public.custom_roles
    FOR ALL USING (
        tenant_id = (
            SELECT u.tenant_id FROM public.users u 
            WHERE u.id = auth.uid() AND u.role = 'tenant_admin'
        )
    );

-- RLS Policies pour role_permissions
CREATE POLICY "Super admin can view all role permissions" ON public.role_permissions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Users can view tenant role permissions" ON public.role_permissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.custom_roles cr
            WHERE cr.id = role_id 
            AND (cr.tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid())
                 OR cr.is_system_role = true)
        )
    );

CREATE POLICY "Super admin can manage all role permissions" ON public.role_permissions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Tenant admin can manage tenant role permissions" ON public.role_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.custom_roles cr, public.users u
            WHERE cr.id = role_id 
            AND u.id = auth.uid() 
            AND u.role = 'tenant_admin'
            AND cr.tenant_id = u.tenant_id
        )
    );

-- Triggers pour updated_at
CREATE TRIGGER update_custom_roles_updated_at 
    BEFORE UPDATE ON public.custom_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour vérifier les permissions d'un utilisateur
CREATE OR REPLACE FUNCTION public.user_has_permission(
    _user_id UUID,
    _module_name TEXT,
    _action TEXT
) RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.users u
        LEFT JOIN public.user_role_assignments ura ON u.id = ura.user_id
        LEFT JOIN public.custom_roles cr ON ura.role_id = cr.id
        LEFT JOIN public.role_permissions rp ON cr.id = rp.role_id
        LEFT JOIN public.permissions p ON rp.permission_id = p.id
        LEFT JOIN public.modules m ON p.module_id = m.id
        WHERE u.id = _user_id
        AND (
            -- Super admin a toutes les permissions
            u.role = 'super_admin'
            OR
            -- Ou l'utilisateur a la permission spécifique
            (m.name = _module_name AND p.action = _action)
        )
    );
$$;
