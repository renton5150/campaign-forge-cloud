
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ContactList, Contact } from '@/types/database';

export function useContactLists() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Récupérer toutes les listes de contacts
  const { data: contactLists, isLoading } = useQuery({
    queryKey: ['contact_lists', user?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_lists')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as ContactList[];
    },
    enabled: !!user,
  });

  // Créer une liste de contacts
  const createContactList = useMutation({
    mutationFn: async (listData: Pick<ContactList, 'name' | 'description'>) => {
      console.log('Création de liste - User:', user);
      console.log('Création de liste - Data:', listData);
      
      const insertData = {
        ...listData,
        tenant_id: user?.tenant_id || null,
        created_by: user?.id
      };
      
      console.log('Création de liste - Insert data:', insertData);
      
      const { data, error } = await supabase
        .from('contact_lists')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Erreur création liste:', error);
        throw new Error(`Erreur lors de la création de la liste: ${error.message} (Code: ${error.code})`);
      }
      
      console.log('Liste créée avec succès:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact_lists'] });
    },
  });

  // Récupérer les contacts d'une liste
  const getListContacts = async (listId: string): Promise<Contact[]> => {
    const { data, error } = await supabase
      .from('contacts')
      .select(`
        *,
        contact_list_memberships!inner(list_id)
      `)
      .eq('contact_list_memberships.list_id', listId);

    if (error) throw error;
    return data as Contact[];
  };

  // Modifier une liste de contacts
  const updateContactList = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContactList> & { id: string }) => {
      const { data, error } = await supabase
        .from('contact_lists')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact_lists'] });
    },
  });

  // Supprimer une liste de contacts
  const deleteContactList = useMutation({
    mutationFn: async (listId: string) => {
      const { error } = await supabase
        .from('contact_lists')
        .delete()
        .eq('id', listId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact_lists'] });
    },
  });

  return {
    contactLists,
    isLoading,
    createContactList,
    updateContactList,
    deleteContactList,
    getListContacts,
  };
}
