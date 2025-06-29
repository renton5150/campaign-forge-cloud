
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Shield, Users, Settings } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CustomRole, UserRoleAssignment } from '@/types/database';

export default function RolesManagement() {
  const { user } = useAuth();
  const { roles, modules, permissions, isLoading } = usePermissions();
  const queryClient = useQueryClient();

  // Récupérer les assignations de rôles avec jointure explicite
  const { data: roleAssignments } = useQuery({
    queryKey: ['user_role_assignments', user?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_role_assignments')
        .select(`
          *,
          users!user_role_assignments_user_id_fkey(full_name, email),
          custom_roles!user_role_assignments_role_id_fkey(name, label)
        `);
      
      if (error) throw error;
      return data as (UserRoleAssignment & {
        users: { full_name: string; email: string };
        custom_roles: { name: string; label: string };
      })[];
    },
    enabled: !!user,
  });

  const getRoleTypeColor = (role: CustomRole) => {
    if (role.is_system_role) return 'bg-purple-100 text-purple-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getRoleIcon = (roleName: string) => {
    switch (roleName) {
      case 'super_admin':
        return <Shield className="h-4 w-4" />;
      case 'tenant_admin':
        return <Settings className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des rôles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Rôles</h1>
          <p className="text-gray-600 mt-2">
            Gérez les rôles et permissions de votre organisation
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Rôle
        </Button>
      </div>

      <Tabs defaultValue="roles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="roles">Rôles</TabsTrigger>
          <TabsTrigger value="assignments">Assignations</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roles?.map((role) => (
              <Card key={role.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getRoleIcon(role.name)}
                      <CardTitle className="text-lg">{role.label}</CardTitle>
                    </div>
                    <Badge className={getRoleTypeColor(role)}>
                      {role.is_system_role ? 'Système' : 'Personnalisé'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm mb-4">
                    {role.description || 'Aucune description'}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      Créé le {new Date(role.created_at).toLocaleDateString()}
                    </span>
                    <Button variant="outline" size="sm">
                      Modifier
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assignations de Rôles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {roleAssignments?.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div>
                        <p className="font-medium">{assignment.users.full_name}</p>
                        <p className="text-sm text-gray-600">{assignment.users.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">
                        {assignment.custom_roles.label}
                      </Badge>
                      <Button variant="outline" size="sm">
                        Modifier
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <div className="grid gap-6">
            {modules?.map((module) => (
              <Card key={module.id}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>{module.label}</span>
                    <Badge variant="outline">{module.name}</Badge>
                  </CardTitle>
                  <p className="text-gray-600">{module.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                    {permissions
                      ?.filter((permission) => permission.module_id === module.id)
                      .map((permission) => (
                        <div
                          key={permission.id}
                          className="p-3 border rounded-lg bg-gray-50"
                        >
                          <p className="font-medium text-sm">{permission.label}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            {permission.action}
                          </p>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
