
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface TemplateCategory {
  id: string;
  tenant_id: string | null;
  name: string;
  description: string | null;
  is_system_category: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useTemplateCategories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ['template_categories', user?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('template_categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as TemplateCategory[];
    },
    enabled: !!user,
  });

  const createCategory = useMutation({
    mutationFn: async (categoryData: Omit<TemplateCategory, 'id' | 'created_at' | 'updated_at' | 'is_system_category'>) => {
      const { data, error } = await supabase
        .from('template_categories')
        .insert({
          ...categoryData,
          tenant_id: user?.tenant_id,
          created_by: user?.id,
          is_system_category: false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template_categories'] });
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TemplateCategory> & { id: string }) => {
      const { data, error } = await supabase
        .from('template_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template_categories'] });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('template_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template_categories'] });
    },
  });

  return {
    categories: categories || [],
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
