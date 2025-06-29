
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Campaign, CampaignStats } from '@/types/database';

export function useCampaigns() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Récupérer toutes les campagnes
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns', user?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          email_templates(name),
          users!campaigns_created_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as (Campaign & {
        email_templates: { name: string } | null;
        users: { full_name: string };
      })[];
    },
    enabled: !!user,
  });

  // Créer une campagne
  const createCampaign = useMutation({
    mutationFn: async (campaignData: Omit<Campaign, 'id' | 'created_at' | 'updated_at' | 'sent_at'>) => {
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          ...campaignData,
          tenant_id: user?.tenant_id,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  // Mettre à jour une campagne
  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Campaign> & { id: string }) => {
      const { data, error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  // Supprimer une campagne
  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  // Récupérer les statistiques d'une campagne
  const getCampaignStats = async (campaignId: string): Promise<CampaignStats> => {
    const { data, error } = await supabase.rpc('get_campaign_stats', {
      campaign_id_param: campaignId
    });

    if (error) throw error;
    return data;
  };

  return {
    campaigns,
    isLoading,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    getCampaignStats,
  };
}
