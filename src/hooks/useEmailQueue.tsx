
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { EmailQueue, QueueCampaignResult } from '@/types/database';

export interface QueueStats {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  total: number;
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
    queryFn: async (): Promise<EmailQueue[]> => {
      const { data, error } = await supabase
        .from('email_queue')
        .select(`
          *,
          campaigns!inner(tenant_id)
        `)
        .eq('campaigns.tenant_id', user?.tenant_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as EmailQueue[];
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
      
      // Utiliser l'implémentation directe comme dans useEmailQueueNew
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

        console.log('✅ Campagne mise en queue avec succès:', { queuedCount, duplicatesSkipped });

        return {
          queued: queuedCount,
          uniqueContacts: queuedCount,
          cleaningResult: {
            cleanedContacts: [],
            totalOriginalContacts: queuedCount,
            blacklistedEmails: [],
            duplicateEmails: duplicatesSkipped || 0
          }
        };

      } catch (error: any) {
        console.error('❌ Error in sendCampaign:', error);
        throw error;
      }
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
      // Récupérer les emails échoués et les mettre à jour
      const { data: failedEmails, error: selectError } = await supabase
        .from('email_queue')
        .select('id, retry_count')
        .eq('campaign_id', campaignId)
        .eq('status', 'failed');

      if (selectError) throw selectError;

      // Mettre à jour le statut
      const { error: updateError } = await supabase
        .from('email_queue')
        .update({ 
          status: 'pending',
          retry_count: 0,
          error_message: null,
          error_code: null,
          scheduled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('campaign_id', campaignId)
        .eq('status', 'failed');

      if (updateError) throw updateError;

      return failedEmails?.length || 0;
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
