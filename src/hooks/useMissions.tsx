
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Mission {
  id: string;
  tenant_id: string | null;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useMissions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: missions, isLoading } = useQuery({
    queryKey: ['missions', user?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Mission[];
    },
    enabled: !!user,
  });

  const createMission = useMutation({
    mutationFn: async (missionData: Omit<Mission, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('missions')
        .insert({
          ...missionData,
          tenant_id: user?.tenant_id,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });

  const updateMission = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Mission> & { id: string }) => {
      const { data, error } = await supabase
        .from('missions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });

  const deleteMission = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('missions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });

  return {
    missions: missions || [],
    isLoading,
    createMission,
    updateMission,
    deleteMission,
  };
}
