
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ExtendedEmailTemplate {
  id: string;
  tenant_id: string | null;
  name: string;
  description: string | null;
  category: string;
  html_content: string;
  preview_text: string | null;
  is_system_template: boolean;
  thumbnail_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  mission_id: string | null;
  tags: string[];
  usage_count: number;
  is_favorite: boolean;
  last_used_at: string | null;
  missions?: { name: string } | null;
  template_categories?: { name: string } | null;
}

export function useEmailTemplates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['email_templates', user?.tenant_id],
    queryFn: async () => {
      // First, get the basic template data
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform the data to match our ExtendedEmailTemplate interface
      return data.map(template => ({
        ...template,
        missions: null, // Set to null for now since relation might not exist
        template_categories: null // Set to null for now since relation might not exist
      })) as ExtendedEmailTemplate[];
    },
    enabled: !!user,
  });

  const createTemplate = useMutation({
    mutationFn: async (templateData: Omit<ExtendedEmailTemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count' | 'last_used_at'>) => {
      const { data, error } = await supabase
        .from('email_templates')
        .insert({
          ...templateData,
          tenant_id: user?.tenant_id,
          created_by: user?.id,
          usage_count: 0,
          is_favorite: false
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

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ExtendedEmailTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('email_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_templates'] });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_templates'] });
    },
  });

  const duplicateTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const { data: original, error: fetchError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('email_templates')
        .insert({
          ...original,
          id: undefined,
          name: `${original.name} (Copie)`,
          created_by: user?.id,
          tenant_id: user?.tenant_id,
          usage_count: 0,
          is_favorite: false,
          created_at: undefined,
          updated_at: undefined,
          last_used_at: null
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

  const toggleFavorite = useMutation({
    mutationFn: async ({ id, is_favorite }: { id: string; is_favorite: boolean }) => {
      const { data, error } = await supabase
        .from('email_templates')
        .update({ is_favorite })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_templates'] });
    },
  });

  const incrementUsage = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('email_templates')
        .update({ 
          usage_count: (templates?.find(t => t.id === id)?.usage_count || 0) + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', id)
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
    templates: templates || [],
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    toggleFavorite,
    incrementUsage,
  };
}
