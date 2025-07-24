import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Contact } from '@/types/database';

export function useContacts(listId?: string, searchTerm?: string, status?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Récupérer les contacts avec filtres
  const { data: contacts, isLoading } = useQuery({
    queryKey: ['contacts', user?.tenant_id, listId, searchTerm, status],
    queryFn: async () => {
      let query = supabase
        .from('contacts')
        .select(`
          *,
          contact_list_memberships!inner(list_id, added_at),
          contact_lists!inner(name)
        `)
        .order('created_at', { ascending: false });

      if (listId) {
        query = query.eq('contact_list_memberships.list_id', listId);
      }

      if (searchTerm) {
        query = query.or(`email.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%`);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as (Contact & { contact_list_memberships: any[], contact_lists: any })[];
    },
    enabled: !!user,
  });

  // Créer un contact
  const createContact = useMutation({
    mutationFn: async (contactData: Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'tenant_id' | 'created_by'>) => {
      console.log('Creating contact with data:', contactData);

      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      if (!user.id) {
        throw new Error('ID utilisateur manquant');
      }

      const insertData = {
        ...contactData,
        tenant_id: user.tenant_id,
        created_by: user.id
      };

      console.log('Inserting contact with data:', insertData);
      
      const { data, error } = await supabase
        .from('contacts')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating contact:', error);
        throw new Error(`Erreur lors de la création du contact: ${error.message}`);
      }
      
      console.log('Contact created successfully:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact_lists'] });
    },
  });

  // Mettre à jour un contact
  const updateContact = useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<Contact> & { id: string }) => {
      const { data, error } = await supabase
        .from('contacts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  // Supprimer un contact
  const deleteContact = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact_lists'] });
    },
  });

  // Ajouter un contact à une liste
  const addToList = useMutation({
    mutationFn: async ({ contactId, listId }: { contactId: string; listId: string }) => {
      const { data, error } = await supabase
        .from('contact_list_memberships')
        .insert({
          contact_id: contactId,
          list_id: listId,
          added_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact_lists'] });
    },
  });

  // Retirer un contact d'une liste
  const removeFromList = useMutation({
    mutationFn: async ({ contactId, listId }: { contactId: string; listId: string }) => {
      const { error } = await supabase
        .from('contact_list_memberships')
        .delete()
        .eq('contact_id', contactId)
        .eq('list_id', listId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact_lists'] });
    },
  });

  // Actions en lot
  const bulkUpdateContacts = useMutation({
    mutationFn: async ({ contactIds, updateData }: { contactIds: string[]; updateData: Partial<Contact> }) => {
      const { data, error } = await supabase
        .from('contacts')
        .update(updateData)
        .in('id', contactIds)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  return {
    contacts: contacts || [],
    isLoading,
    createContact,
    updateContact,
    deleteContact,
    addToList,
    removeFromList,
    bulkUpdateContacts,
  };
}
