
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface BlacklistList {
  id: string;
  tenant_id: string | null;
  name: string;
  description?: string;
  type: 'email' | 'domain' | 'mixed';
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useBlacklistLists() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Récupérer les listes de blacklist
  const { data: blacklistLists, isLoading } = useQuery({
    queryKey: ['blacklistLists', user?.tenant_id, user?.role],
    queryFn: async () => {
      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      const { data, error } = await supabase
        .from('blacklist_lists')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching blacklist lists:', error);
        throw error;
      }
      return data as BlacklistList[];
    },
    enabled: !!user,
  });

  // Créer une liste de blacklist
  const createBlacklistList = useMutation({
    mutationFn: async (listData: Omit<BlacklistList, 'id' | 'created_at' | 'updated_at' | 'tenant_id'>) => {
      if (!user?.id) {
        throw new Error('Utilisateur non authentifié ou données manquantes');
      }

      const tenantId = user.role === 'super_admin' ? null : user.tenant_id;
      
      if (user.role !== 'super_admin' && !tenantId) {
        throw new Error('Utilisateur sans tenant associé');
      }

      const dataToInsert = {
        ...listData,
        tenant_id: tenantId,
        created_by: user.id
      };

      const { data, error } = await supabase
        .from('blacklist_lists')
        .insert(dataToInsert)
        .select()
        .single();

      if (error) {
        console.error('Error creating blacklist list:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blacklistLists'] });
    },
  });

  // Mettre à jour une liste de blacklist
  const updateBlacklistList = useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<BlacklistList> & { id: string }) => {
      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      const { data, error } = await supabase
        .from('blacklist_lists')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating blacklist list:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blacklistLists'] });
    },
  });

  // Supprimer une liste de blacklist
  const deleteBlacklistList = useMutation({
    mutationFn: async (listId: string) => {
      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      const { error } = await supabase
        .from('blacklist_lists')
        .delete()
        .eq('id', listId);

      if (error) {
        console.error('Error deleting blacklist list:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blacklistLists'] });
    },
  });

  return {
    blacklistLists: blacklistLists || [],
    isLoading,
    createBlacklistList,
    updateBlacklistList,
    deleteBlacklistList,
  };
}
