
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { emailWorker } from '@/lib/emailWorker';
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
        if (item.status && item.status in stats) {
          stats[item.status as keyof Omit<QueueStats, 'total'>]++;
        }
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
    }): Promise<QueueCampaignResult> => {
      console.log('🚀 Queuing campaign:', { campaignId, contactListIds });
      
      // Appel direct à la fonction queue_campaign_for_sending
      try {
        // Récupérer la campagne
        const { data: campaign, error: campaignError } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', campaignId)
          .single();

        if (campaignError) throw campaignError;

        // Récupérer les contacts des listes
        const { data: contacts, error: contactsError } = await supabase
          .from('contacts')
          .select(`
            id,
            email,
            first_name,
            last_name
          `)
          .in('id', 
            supabase
              .from('contact_list_memberships')
              .select('contact_id')
              .in('list_id', contactListIds)
          )
          .eq('status', 'active');

        if (contactsError) throw contactsError;

        let queuedCount = 0;
        let duplicatesSkipped = 0;

        // Insérer chaque contact dans la queue
        for (const contact of contacts || []) {
          const messageId = `${campaignId}-${contact.id}-${Date.now()}`;
          
          // Vérifier les doublons
          const { data: existing } = await supabase
            .from('email_queue')
            .select('id')
            .eq('campaign_id', campaignId)
            .eq('contact_email', contact.email)
            .limit(1);

          if (existing && existing.length > 0) {
            duplicatesSkipped++;
            continue;
          }

          // Insérer dans la queue
          const { error: insertError } = await supabase
            .from('email_queue')
            .insert({
              campaign_id: campaignId,
              contact_email: contact.email,
              contact_name: contact.first_name && contact.last_name 
                ? `${contact.first_name} ${contact.last_name}` 
                : contact.email,
              subject: campaign.subject,
              html_content: campaign.html_content,
              message_id: messageId,
              status: 'pending',
              scheduled_for: campaign.scheduled_at || new Date().toISOString()
            });

          if (!insertError) {
            queuedCount++;
          }
        }

        const result: QueueCampaignResult = {
          success: true,
          queued_emails: queuedCount,
          duplicates_skipped: duplicatesSkipped,
          message: `Campagne mise en queue - ${queuedCount} emails à envoyer`
        };

        console.log('✅ Campaign queued successfully:', result);
        return result;

      } catch (error: any) {
        console.error('❌ Error queuing campaign:', error);
        throw error;
      }
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
          error_code: null,
          updated_at: new Date().toISOString()
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
