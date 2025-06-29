
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PersonalTemplate {
  id: string;
  created_by: string;
  name: string;
  html_content: string;
  description?: string;
  category: string;
  preview_text?: string;
  thumbnail_url?: string;
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
        .eq('created_by', user.id)
        .eq('is_system_template', false)
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
          created_by: user.id,
          name,
          html_content,
          category: 'custom',
          is_system_template: false,
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
        .eq('created_by', user?.id);

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
