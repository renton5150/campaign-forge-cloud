import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ContactActivity {
  id: string;
  contact_id: string;
  activity_type: 'email_open' | 'email_click' | 'email_bounce' | 'unsubscribe' | 'import' | 'manual_add';
  campaign_id?: string;
  details: Record<string, any>;
  timestamp: string;
  created_at: string;
}

export function useContactActivities(contactId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Récupérer les activités d'un contact
  const { data: activities, isLoading } = useQuery({
    queryKey: ['contact_activities', contactId],
    queryFn: async () => {
      if (!contactId) return [];

      const { data, error } = await supabase
        .from('contact_activities')
        .select(`
          *,
          campaigns(name, subject)
        `)
        .eq('contact_id', contactId)
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      return data as (ContactActivity & { campaigns?: any })[];
    },
    enabled: !!contactId && !!user,
  });

  // Créer une activité
  const createActivity = useMutation({
    mutationFn: async (activityData: Omit<ContactActivity, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('contact_activities')
        .insert(activityData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact_activities'] });
    },
  });

  // Calculer le score d'engagement
  const calculateEngagementScore = useMutation({
    mutationFn: async (contactId: string) => {
      const { data, error } = await supabase
        .rpc('calculate_engagement_score', { contact_id_param: contactId });

      if (error) throw error;
      
      // Mettre à jour le contact avec le nouveau score
      await supabase
        .from('contacts')
        .update({ engagement_score: data })
        .eq('id', contactId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact_activities'] });
    },
  });

  return {
    activities: activities || [],
    isLoading,
    createActivity,
    calculateEngagementScore,
  };
}