
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface EmailQueueItem {
  id: string;
  campaign_id: string;
  contact_email: string;
  contact_name: string | null;
  subject: string;
  html_content: string;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  message_id: string | null;
  scheduled_for: string;
  sent_at: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
}

export interface QueueStats {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  total: number;
}

interface QueueCampaignResult {
  success: boolean;
  queued_emails: number;
  duplicates_skipped: number;
  message: string;
}

export function useEmailQueue() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Obtenir les statistiques de queue pour une campagne
  const getCampaignQueueStats = async (campaignId: string): Promise<QueueStats> => {
    const { data, error } = await supabase
      .from('email_queue')
      .select('status')
      .eq('campaign_id', campaignId);

    if (error) throw error;

    const stats = {
      pending: 0,
      processing: 0,
      sent: 0,
      failed: 0,
      total: data.length
    };

    data.forEach(item => {
      if (item.status && item.status in stats) {
        stats[item.status as keyof Omit<QueueStats, 'total'>]++;
      }
    });

    return stats;
  };

  // Obtenir la queue d'une campagne
  const { data: queueItems, isLoading } = useQuery({
    queryKey: ['email-queue', user?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_queue')
        .select(`
          *
        `)
        .eq('tenant_id', user?.tenant_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Envoyer une campagne avec la nouvelle fonction de queue
  const sendCampaign = useMutation({
    mutationFn: async ({ 
      campaignId, 
      subject, 
      htmlContent, 
      contactListIds,
      blacklistListIds = []
    }: { 
      campaignId: string; 
      subject: string; 
      htmlContent: string; 
      contactListIds: string[];
      blacklistListIds?: string[];
    }): Promise<{
      queued: number;
      uniqueContacts: number;
      cleaningResult: any;
    }> => {
      
      console.log('🚀 Début de l\'envoi de campagne via nouvelle queue');
      
      // Utiliser la nouvelle fonction de mise en queue
      const { data, error } = await supabase.rpc('queue_campaign_for_sending', {
        p_campaign_id: campaignId,
        p_contact_list_ids: contactListIds
      });

      if (error) throw error;

      const result = data as QueueCampaignResult;
      console.log('✅ Campagne mise en queue avec succès:', result);

      return {
        queued: result.queued_emails,
        uniqueContacts: result.queued_emails,
        cleaningResult: {
          cleanedContacts: [],
          totalOriginalContacts: result.queued_emails,
          blacklistedEmails: [],
          duplicateEmails: result.duplicates_skipped || 0
        }
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['email-queue'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      return result;
    },
  });

  // Relancer les emails échoués
  const retryFailedEmails = useMutation({
    mutationFn: async (campaignId: string) => {
      // D'abord récupérer les emails échoués
      const { data: failedEmails, error: selectError } = await supabase
        .from('email_queue')
        .select('id, retry_count')
        .eq('campaign_id', campaignId)
        .eq('status', 'failed');

      if (selectError) throw selectError;

      // Ensuite les mettre à jour un par un
      const updates = failedEmails.map(email => 
        supabase
          .from('email_queue')
          .update({ 
            status: 'pending',
            retry_count: (email.retry_count || 0) + 1,
            error_message: null
          })
          .eq('id', email.id)
      );

      const results = await Promise.all(updates);
      const errors = results.filter(result => result.error);
      
      if (errors.length > 0) {
        throw errors[0].error;
      }

      return failedEmails.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-queue'] });
    },
  });

  return {
    queueItems,
    isLoading,
    sendCampaign,
    retryFailedEmails,
    getCampaignQueueStats,
  };
}
