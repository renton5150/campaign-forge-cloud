
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { EmailTemplate } from '@/types/database';

export function useEmailTemplates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Récupérer tous les templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['email_templates', user?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as EmailTemplate[];
    },
    enabled: !!user,
  });

  // Créer un template
  const createTemplate = useMutation({
    mutationFn: async (templateData: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('email_templates')
        .insert({
          ...templateData,
          tenant_id: user?.tenant_id,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_templates'] });
    },
  });

  return {
    templates,
    isLoading,
    createTemplate,
  };
}
