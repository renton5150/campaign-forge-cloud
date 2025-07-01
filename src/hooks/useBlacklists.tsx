import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Blacklist {
  id: string;
  tenant_id: string;
  type: 'email' | 'domain';
  value: string;
  reason?: string;
  category: 'bounce' | 'complaint' | 'manual' | 'competitor';
  created_by: string;
  created_at: string;
}

export function useBlacklists(type?: 'email' | 'domain') {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Récupérer les blacklists
  const { data: blacklists, isLoading } = useQuery({
    queryKey: ['blacklists', user?.tenant_id, type],
    queryFn: async () => {
      let query = supabase
        .from('blacklists')
        .select('*')
        .order('created_at', { ascending: false });

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as Blacklist[];
    },
    enabled: !!user,
  });

  // Ajouter à la blacklist
  const addToBlacklist = useMutation({
    mutationFn: async (blacklistData: Omit<Blacklist, 'id' | 'created_at' | 'tenant_id'>) => {
      const { data, error } = await supabase
        .from('blacklists')
        .insert({
          ...blacklistData,
          tenant_id: user?.tenant_id,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blacklists'] });
    },
  });

  // Supprimer de la blacklist
  const removeFromBlacklist = useMutation({
    mutationFn: async (blacklistId: string) => {
      const { error } = await supabase
        .from('blacklists')
        .delete()
        .eq('id', blacklistId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blacklists'] });
    },
  });

  // Vérifier si un email/domaine est blacklisté
  const checkBlacklist = async (value: string, type: 'email' | 'domain'): Promise<boolean> => {
    const { data, error } = await supabase
      .from('blacklists')
      .select('id')
      .eq('type', type)
      .eq('value', value)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  };

  // Import en masse
  const bulkImportBlacklist = useMutation({
    mutationFn: async ({ items, type, category }: { 
      items: string[]; 
      type: 'email' | 'domain'; 
      category: Blacklist['category'] 
    }) => {
      const blacklistItems = items.map(value => ({
        tenant_id: user?.tenant_id,
        type,
        value: value.trim().toLowerCase(),
        category,
        reason: `Import en masse - ${category}`,
        created_by: user?.id
      }));

      const { data, error } = await supabase
        .from('blacklists')
        .insert(blacklistItems)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blacklists'] });
    },
  });

  return {
    blacklists: blacklists || [],
    isLoading,
    addToBlacklist,
    removeFromBlacklist,
    checkBlacklist,
    bulkImportBlacklist,
  };
}