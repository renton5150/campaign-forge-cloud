
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

        try {
          const { data, error } = await supabase
            .from('blacklist_item_lists' as any)
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
            // Retourner un tableau vide en cas d'erreur plutôt que de throw
            return [];
          }
          return data || [];
        } catch (error) {
          console.error('Error in getBlacklistItemLists:', error);
          return [];
        }
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

      try {
        const { data, error } = await supabase
          .from('blacklist_item_lists' as any)
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
      } catch (error) {
        console.error('Error in addToList:', error);
        throw error;
      }
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

      try {
        const { error } = await supabase
          .from('blacklist_item_lists' as any)
          .delete()
          .eq('blacklist_id', blacklistId)
          .eq('blacklist_list_id', listId);

        if (error) {
          console.error('Error removing from blacklist list:', error);
          throw error;
        }
      } catch (error) {
        console.error('Error in removeFromList:', error);
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

      try {
        const associations = listIds.map(listId => ({
          blacklist_id: blacklistId,
          blacklist_list_id: listId,
          added_by: user.id
        }));

        const { data, error } = await supabase
          .from('blacklist_item_lists' as any)
          .insert(associations)
          .select();

        if (error) {
          console.error('Error adding to multiple lists:', error);
          throw error;
        }
        return data;
      } catch (error) {
        console.error('Error in addToMultipleLists:', error);
        throw error;
      }
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
