
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PersonalTemplate {
  id: string;
  user_id: string;
  name: string;
  html_content: string;
  preview_image?: string;
  created_at: string;
  updated_at: string;
}

export function usePersonalTemplates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Récupérer tous les templates personnels de l'utilisateur
  const { data: templates, isLoading } = useQuery({
    queryKey: ['personal_templates', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PersonalTemplate[];
    },
    enabled: !!user?.id,
  });

  // Créer un nouveau template
  const createTemplate = useMutation({
    mutationFn: async ({ name, html_content }: { name: string; html_content: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('email_templates')
        .insert({
          user_id: user.id,
          name,
          html_content,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal_templates'] });
    },
  });

  // Supprimer un template
  const deleteTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', templateId)
        .eq('user_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal_templates'] });
    },
  });

  return {
    templates: templates || [],
    isLoading,
    createTemplate,
    deleteTemplate,
  };
}
