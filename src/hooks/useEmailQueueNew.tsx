
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { emailWorker } from '@/lib/emailWorker';

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

  // Statistiques de queue
  const { data: queueStats, isLoading } = useQuery({
    queryKey: ['email-queue-stats', user?.tenant_id],
    queryFn: async (): Promise<QueueStats> => {
      const { data, error } = await supabase
        .from('email_queue')
        .select('status')
        .eq('tenant_id', user?.tenant_id);

      if (error) throw error;

      const stats: QueueStats = {
        pending: 0,
        processing: 0,
        sent: 0,
        failed: 0,
        bounced: 0,
        total: data.length
      };

      data.forEach(item => {
        stats[item.status as keyof Omit<QueueStats, 'total'>]++;
      });

      return stats;
    },
    enabled: !!user?.tenant_id,
    refetchInterval: 5000 // Actualiser toutes les 5 secondes
  });

  // Queue détaillée pour une campagne
  const getCampaignQueue = async (campaignId: string) => {
    const { data, error } = await supabase
      .from('email_queue')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  };

  // Mutation pour mettre une campagne en queue
  const queueCampaignMutation = useMutation({
    mutationFn: async ({ campaignId, contactListIds }: {
      campaignId: string;
      contactListIds: string[];
    }) => {
      console.log('🚀 Queuing campaign:', { campaignId, contactListIds });
      
      const { data, error } = await supabase.rpc('queue_campaign_for_sending', {
        p_campaign_id: campaignId,
        p_contact_list_ids: contactListIds
      });

      if (error) {
        console.error('❌ Error queuing campaign:', error);
        throw error;
      }
      
      console.log('✅ Campaign queued successfully:', data);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email-queue-stats'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      
      // Démarrer automatiquement le worker après mise en queue
      emailWorker.start();
    }
  });

  // Mutation pour relancer les emails échoués
  const retryFailedMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase
        .from('email_queue')
        .update({ 
          status: 'pending', 
          retry_count: 0,
          scheduled_at: new Date().toISOString(),
          error_message: null,
          error_code: null 
        })
        .eq('campaign_id', campaignId)
        .eq('status', 'failed');

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-queue-stats'] });
    }
  });

  // Contrôle du worker
  const startWorker = () => {
    console.log('🚀 Starting email worker...');
    emailWorker.start();
  };
  
  const stopWorker = () => {
    console.log('⏹️ Stopping email worker...');
    emailWorker.stop();
  };

  return {
    queueStats,
    isLoading,
    getCampaignQueue,
    queueCampaign: queueCampaignMutation.mutateAsync,
    retryFailed: retryFailedMutation.mutateAsync,
    isQueueing: queueCampaignMutation.isPending,
    isRetrying: retryFailedMutation.isPending,
    startWorker,
    stopWorker
  };
}
