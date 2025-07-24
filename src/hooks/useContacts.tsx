
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Contact } from '@/types/database';
import { ContactInsert, ContactUpdate } from '@/types/contacts';

export function useContacts(listId?: string, searchTerm?: string, status?: string) {
  const { user } = useAuth();
  
  const query = useQuery({
    queryKey: ['contacts', listId, searchTerm, status],
    queryFn: async () => {
      let query = supabase
        .from('contacts')
        .select(`
          *,
          contact_list_memberships(
            list_id,
            contact_lists(name)
          )
        `)
        .order('created_at', { ascending: false });

      // Filtre par liste si spécifié
      if (listId && listId !== 'all-lists') {
        const { data: membershipData, error: membershipError } = await supabase
          .from('contact_list_memberships')
          .select('contact_id')
          .eq('list_id', listId);

        if (membershipError) throw membershipError;
        
        const contactIds = membershipData.map(m => m.contact_id);
        if (contactIds.length > 0) {
          query = query.in('id', contactIds);
        } else {
          // Si la liste n'a pas de contacts, retourner un tableau vide
          return [];
        }
      }

      // Filtre par terme de recherche
      if (searchTerm) {
        query = query.or(`email.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%`);
      }

      // Filtre par statut
      if (status && status !== 'all-status') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as Contact[];
    },
    enabled: !!user,
  });

  const queryClient = useQueryClient();

  const createContact = useMutation({
    mutationFn: async (newContact: ContactInsert) => {
      if (!user) {
        throw new Error('User must be authenticated to create a contact.');
      }

      const contactData = {
        ...newContact,
        tenant_id: user.tenant_id,
        created_by: user.id,
      };

      const { data, error } = await supabase
        .from('contacts')
        .insert([contactData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as Contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  const updateContact = useMutation({
    mutationFn: async ({ id, ...updates }: ContactUpdate & { id: string }) => {
      if (!user) {
        throw new Error('User must be authenticated to update a contact.');
      }

      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as Contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      if (!user) {
        throw new Error('User must be authenticated to delete a contact.');
      }

      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  const addToList = useMutation({
    mutationFn: async ({ contactId, listId }: { contactId: string, listId: string }) => {
      if (!user) {
        throw new Error('User must be authenticated to add a contact to a list.');
      }

      const { data, error } = await supabase
        .from('contact_list_memberships')
        .insert([{ 
          contact_id: contactId, 
          list_id: listId,
          added_by: user.id
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact_lists'] });
    },
  });

  const removeFromList = useMutation({
    mutationFn: async ({ contactId, listId }: { contactId: string, listId: string }) => {
      if (!user) {
        throw new Error('User must be authenticated to remove a contact from a list.');
      }

      const { error } = await supabase
        .from('contact_list_memberships')
        .delete()
        .eq('contact_id', contactId)
        .eq('list_id', listId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact_lists'] });
    },
  });

  return {
    ...query,
    contacts: query.data || [],
    createContact,
    updateContact,
    deleteContact,
    addToList,
    removeFromList,
  };
}
