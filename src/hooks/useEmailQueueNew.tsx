
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

  // Mutation pour mettre une campagne en queue - système professionnel
  const queueCampaignMutation = useMutation({
    mutationFn: async ({ campaignId, contactListIds }: {
      campaignId: string;
      contactListIds: string[];
    }): Promise<QueueCampaignResult> => {
      console.log('🚀 Queuing campaign with professional system:', { campaignId, contactListIds });
      
      try {
        // Récupérer la campagne
        const { data: campaign, error: campaignError } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', campaignId)
          .single();

        if (campaignError) throw campaignError;

        // Récupérer les contacts des listes sélectionnées
        let contactsQuery = supabase
          .from('contacts')
          .select('id, email, first_name, last_name')
          .eq('status', 'active');

        if (contactListIds.length > 0) {
          const { data: memberships, error: membershipsError } = await supabase
            .from('contact_list_memberships')
            .select('contact_id')
            .in('list_id', contactListIds);

          if (membershipsError) throw membershipsError;

          const contactIds = memberships?.map(m => m.contact_id) || [];
          if (contactIds.length > 0) {
            contactsQuery = contactsQuery.in('id', contactIds);
          }
        }

        const { data: contacts, error: contactsError } = await contactsQuery;
        if (contactsError) throw contactsError;

        let queuedCount = 0;
        let duplicatesSkipped = 0;

        // Insérer chaque contact dans la queue avec système anti-doublon professionnel
        for (const contact of contacts || []) {
          // Message ID unique pour éviter les doublons - système professionnel
          const messageId = `${campaignId}-${contact.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          // Vérifier les doublons avec le système professionnel
          const { data: existing } = await supabase
            .from('email_queue')
            .select('id')
            .eq('campaign_id', campaignId)
            .eq('contact_email', contact.email)
            .in('status', ['pending', 'processing', 'sent'])
            .limit(1);

          if (existing && existing.length > 0) {
            duplicatesSkipped++;
            continue;
          }

          // Insérer dans la queue avec le système professionnel
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
              scheduled_for: campaign.scheduled_at || new Date().toISOString(),
              retry_count: 0
            });

          if (!insertError) {
            queuedCount++;
          }
        }

        const result: QueueCampaignResult = {
          success: true,
          queued_emails: queuedCount,
          duplicates_skipped: duplicatesSkipped,
          message: `Campagne mise en queue (système professionnel) - ${queuedCount} emails à envoyer`
        };

        console.log('✅ Campaign queued successfully with professional system:', result);
        return result;

      } catch (error: any) {
        console.error('❌ Error queuing campaign with professional system:', error);
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
