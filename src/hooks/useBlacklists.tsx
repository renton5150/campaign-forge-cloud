
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
    queryKey: ['blacklists', user?.tenant_id, user?.role, type],
    queryFn: async () => {
      if (!user) {
        console.error('User not found:', user);
        throw new Error('Utilisateur non authentifié');
      }

      // Pour les super_admin, on peut récupérer toutes les blacklists
      // Pour les autres, on filtre par tenant_id
      let query = supabase
        .from('blacklists')
        .select('*')
        .order('created_at', { ascending: false });

      if (user.role === 'super_admin') {
        // Super admin peut voir toutes les blacklists
        console.log('Super admin - fetching all blacklists');
      } else {
        if (!user.tenant_id) {
          console.error('User tenant_id not found:', user);
          throw new Error('Utilisateur sans tenant associé');
        }
        query = query.eq('tenant_id', user.tenant_id);
      }

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching blacklists:', error);
        throw error;
      }
      return data as Blacklist[];
    },
    enabled: !!user,
  });

  // Ajouter à la blacklist
  const addToBlacklist = useMutation({
    mutationFn: async (blacklistData: Omit<Blacklist, 'id' | 'created_at' | 'tenant_id'>) => {
      if (!user?.id) {
        console.error('User data missing:', { user });
        throw new Error('Utilisateur non authentifié ou données manquantes');
      }

      // Pour les super_admin, on peut utiliser un tenant_id par défaut ou null
      // Pour les autres, on vérifie qu'ils ont un tenant_id
      let tenantId = user.tenant_id;
      
      if (user.role === 'super_admin' && !tenantId) {
        // Pour les super_admin, on peut créer une blacklist globale avec tenant_id null
        // Ou bien utiliser un tenant_id par défaut
        console.log('Super admin adding to global blacklist');
        tenantId = null;
      } else if (!tenantId) {
        throw new Error('Utilisateur sans tenant associé');
      }

      const dataToInsert = {
        ...blacklistData,
        tenant_id: tenantId,
        created_by: user.id
      };

      console.log('Inserting blacklist data:', dataToInsert);

      const { data, error } = await supabase
        .from('blacklists')
        .insert(dataToInsert)
        .select()
        .single();

      if (error) {
        console.error('Error inserting blacklist:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blacklists'] });
    },
  });

  // Supprimer de la blacklist
  const removeFromBlacklist = useMutation({
    mutationFn: async (blacklistId: string) => {
      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      let query = supabase
        .from('blacklists')
        .delete()
        .eq('id', blacklistId);

      // Pour les super_admin, pas de filtre par tenant_id
      if (user.role !== 'super_admin') {
        if (!user.tenant_id) {
          throw new Error('Utilisateur sans tenant associé');
        }
        query = query.eq('tenant_id', user.tenant_id);
      }

      const { error } = await query;

      if (error) {
        console.error('Error deleting blacklist:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blacklists'] });
    },
  });

  // Vérifier si un email/domaine est blacklisté
  const checkBlacklist = async (value: string, type: 'email' | 'domain'): Promise<boolean> => {
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    let query = supabase
      .from('blacklists')
      .select('id')
      .eq('type', type)
      .eq('value', value);

    // Pour les super_admin, on check dans toutes les blacklists
    if (user.role !== 'super_admin') {
      if (!user.tenant_id) {
        throw new Error('Utilisateur sans tenant associé');
      }
      query = query.eq('tenant_id', user.tenant_id);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking blacklist:', error);
      throw error;
    }
    return !!data;
  };

  // Import en masse
  const bulkImportBlacklist = useMutation({
    mutationFn: async ({ items, type, category }: { 
      items: string[]; 
      type: 'email' | 'domain'; 
      category: Blacklist['category'] 
    }) => {
      if (!user?.id) {
        throw new Error('Utilisateur non authentifié ou données manquantes');
      }

      // Pour les super_admin, on peut utiliser un tenant_id par défaut ou null
      let tenantId = user.tenant_id;
      
      if (user.role === 'super_admin' && !tenantId) {
        console.log('Super admin bulk importing to global blacklist');
        tenantId = null;
      } else if (!tenantId) {
        throw new Error('Utilisateur sans tenant associé');
      }

      const blacklistItems = items.map(value => ({
        tenant_id: tenantId,
        type,
        value: value.trim().toLowerCase(),
        category,
        reason: `Import en masse - ${category}`,
        created_by: user.id
      }));

      console.log('Bulk importing blacklist items:', blacklistItems);

      const { data, error } = await supabase
        .from('blacklists')
        .insert(blacklistItems)
        .select();

      if (error) {
        console.error('Error bulk importing blacklist:', error);
        throw error;
      }
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
