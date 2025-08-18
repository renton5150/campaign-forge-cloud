
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { QueueCampaignResult } from '@/types/database';

interface QueueStats {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  bounced: number;
  total: number;
}

export function useEmailQueueNew() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Statistiques de queue - utilise le système professionnel
  const { data: queueStats, isLoading } = useQuery({
    queryKey: ['email-queue-stats', user?.tenant_id],
    queryFn: async (): Promise<QueueStats> => {
      try {
        const { data, error } = await supabase
          .from('email_queue')
          .select('status');

        if (error) throw error;

        const stats: QueueStats = {
          pending: 0,
          processing: 0,
          sent: 0,
          failed: 0,
          bounced: 0,
          total: data?.length || 0
        };

        data?.forEach(item => {
          if (item.status && item.status in stats) {
            stats[item.status as keyof Omit<QueueStats, 'total'>]++;
          }
        });

        return stats;
      } catch (error) {
        console.error('Error loading queue stats:', error);
        return {
          pending: 0,
          processing: 0,
          sent: 0,
          failed: 0,
          bounced: 0,
          total: 0
        };
      }
    },
    enabled: !!user?.tenant_id,
    refetchInterval: 5000
  });

  // Queue détaillée pour une campagne
  const getCampaignQueue = async (campaignId: string) => {
    try {
      const { data, error } = await supabase
        .from('email_queue')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting campaign queue:', error);
      return [];
    }
  };

  // Mutation pour mettre une campagne en queue - système professionnel avec RPC
  const queueCampaignMutation = useMutation({
    mutationFn: async ({ campaignId, contactListIds }: {
      campaignId: string;
      contactListIds: string[];
    }): Promise<QueueCampaignResult> => {
      console.log('🚀 Queuing campaign with professional RPC system:', { campaignId, contactListIds });
      
      try {
        // Si aucune liste fournie, charger automatiquement les listes associées
        let listsToUse = contactListIds;
        
        if (!listsToUse || listsToUse.length === 0) {
          console.log('📋 Aucune liste fournie, chargement des listes associées à la campagne...');
          const { data: campaignLists, error: listsError } = await supabase
            .from('campaign_lists')
            .select('list_id')
            .eq('campaign_id', campaignId);
          
          if (listsError) throw listsError;
          
          listsToUse = campaignLists?.map(cl => cl.list_id) || [];
          console.log('📋 Listes chargées depuis campaign_lists:', listsToUse);
        }

        // Utiliser la fonction RPC pour mettre en queue
        const { data: result, error: rpcError } = await supabase.rpc('queue_campaign_for_sending', {
          p_campaign_id: campaignId,
          p_contact_list_ids: listsToUse
        });

        if (rpcError) {
          console.error('❌ RPC Error:', rpcError);
          throw rpcError;
        }

        // Parse the JSON result from RPC
        const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;

        if (!parsedResult?.success) {
          throw new Error(parsedResult?.error || 'Erreur lors de la mise en queue');
        }

        const queueResult: QueueCampaignResult = {
          success: true,
          queued_emails: parsedResult.queued_emails || 0,
          duplicates_skipped: parsedResult.duplicates_skipped || 0,
          message: parsedResult.message || `${parsedResult.queued_emails || 0} emails mis en queue`
        };

        console.log('✅ Campaign queued successfully with RPC system:', queueResult);
        return queueResult;

      } catch (error: any) {
        console.error('❌ Error queuing campaign with RPC system:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email-queue-stats'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    }
  });

  // Mutation pour relancer les emails échoués - système professionnel
  const retryFailedMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      try {
        const { error } = await supabase
          .from('email_queue')
          .update({ 
            status: 'pending', 
            retry_count: 0,
            scheduled_for: new Date().toISOString(),
            error_message: null,
            error_code: null,
            updated_at: new Date().toISOString()
          })
          .eq('campaign_id', campaignId)
          .eq('status', 'failed');

        if (error) throw error;
        return { success: true };
      } catch (error) {
        console.error('Error retrying failed emails:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-queue-stats'] });
    }
  });

  return {
    queueStats,
    isLoading,
    getCampaignQueue,
    queueCampaign: queueCampaignMutation.mutateAsync,
    retryFailed: retryFailedMutation.mutateAsync,
    isQueueing: queueCampaignMutation.isPending,
    isRetrying: retryFailedMutation.isPending,
  };
}
