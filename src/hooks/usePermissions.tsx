
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Module, Permission, CustomRole, RolePermission } from '@/types/database';

export function usePermissions() {
  const { user } = useAuth();

  // Récupérer tous les modules
  const { data: modules, isLoading: modulesLoading } = useQuery({
    queryKey: ['modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Module[];
    },
    enabled: !!user,
  });

  // Récupérer toutes les permissions
  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('module_id, action');
      
      if (error) throw error;
      return data as Permission[];
    },
    enabled: !!user,
  });

  // Récupérer les rôles disponibles
  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['custom_roles', user?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_roles')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as CustomRole[];
    },
    enabled: !!user,
  });

  // Vérifier si l'utilisateur a une permission spécifique
  const hasPermission = async (moduleName: string, action: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('user_has_permission', {
        _user_id: user.id,
        _module_name: moduleName,
        _action: action
      });

      if (error) {
        console.error('Error checking permission:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  };

  // Récupérer les permissions d'un rôle
  const getRolePermissions = async (roleId: string): Promise<RolePermission[]> => {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('*')
      .eq('role_id', roleId);

    if (error) throw error;
    return data as RolePermission[];
  };

  // Assigner un rôle à un utilisateur
  const assignRoleToUser = async (userId: string, roleId: string) => {
    const { error } = await supabase
      .from('user_role_assignments')
      .insert({
        user_id: userId,
        role_id: roleId,
        assigned_by: user?.id
      });

    if (error) throw error;
  };

  // Créer un nouveau rôle personnalisé
  const createCustomRole = async (role: Omit<CustomRole, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('custom_roles')
      .insert({
        ...role,
        tenant_id: role.is_system_role ? null : user?.tenant_id
      })
      .select()
      .single();

    if (error) throw error;
    return data as CustomRole;
  };

  return {
    modules,
    permissions,
    roles,
    isLoading: modulesLoading || permissionsLoading || rolesLoading,
    hasPermission,
    getRolePermissions,
    assignRoleToUser,
    createCustomRole,
  };
}
