
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface BlacklistItemList {
  id: string;
  blacklist_id: string;
  blacklist_list_id: string;
  added_at: string;
  added_by: string;
}

export function useBlacklistItemLists() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Récupérer les associations pour un élément de blacklist
  const getBlacklistItemLists = (blacklistId: string) => {
    return useQuery({
      queryKey: ['blacklistItemLists', blacklistId],
      queryFn: async () => {
        if (!user || !blacklistId) return [];

        const { data, error } = await supabase
          .from('blacklist_item_lists')
          .select(`
            *,
            blacklist_lists (
              id,
              name,
              type
            )
          `)
          .eq('blacklist_id', blacklistId);

        if (error) {
          console.error('Error fetching blacklist item lists:', error);
          throw error;
        }
        return data || [];
      },
      enabled: !!user && !!blacklistId,
    });
  };

  // Ajouter un élément de blacklist à une liste
  const addToList = useMutation({
    mutationFn: async ({ blacklistId, listId }: { blacklistId: string; listId: string }) => {
      if (!user?.id) {
        throw new Error('Utilisateur non authentifié');
      }

      const { data, error } = await supabase
        .from('blacklist_item_lists')
        .insert({
          blacklist_id: blacklistId,
          blacklist_list_id: listId,
          added_by: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding to blacklist list:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blacklistItemLists'] });
      queryClient.invalidateQueries({ queryKey: ['blacklists'] });
    },
  });

  // Supprimer un élément de blacklist d'une liste
  const removeFromList = useMutation({
    mutationFn: async ({ blacklistId, listId }: { blacklistId: string; listId: string }) => {
      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      const { error } = await supabase
        .from('blacklist_item_lists')
        .delete()
        .eq('blacklist_id', blacklistId)
        .eq('blacklist_list_id', listId);

      if (error) {
        console.error('Error removing from blacklist list:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blacklistItemLists'] });
      queryClient.invalidateQueries({ queryKey: ['blacklists'] });
    },
  });

  // Ajouter un élément à plusieurs listes
  const addToMultipleLists = useMutation({
    mutationFn: async ({ blacklistId, listIds }: { blacklistId: string; listIds: string[] }) => {
      if (!user?.id) {
        throw new Error('Utilisateur non authentifié');
      }

      const associations = listIds.map(listId => ({
        blacklist_id: blacklistId,
        blacklist_list_id: listId,
        added_by: user.id
      }));

      const { data, error } = await supabase
        .from('blacklist_item_lists')
        .insert(associations)
        .select();

      if (error) {
        console.error('Error adding to multiple lists:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blacklistItemLists'] });
      queryClient.invalidateQueries({ queryKey: ['blacklists'] });
    },
  });

  return {
    getBlacklistItemLists,
    addToList,
    removeFromList,
    addToMultipleLists,
  };
}
