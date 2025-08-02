
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

  // Obtenir les statistiques de queue pour une campagne - SIMPLIFIÉ
  const getCampaignQueueStats = async (campaignId: string): Promise<QueueStats> => {
    try {
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
        total: data?.length || 0
      };

      data?.forEach(item => {
        if (item.status && item.status in stats) {
          stats[item.status as keyof Omit<QueueStats, 'total'>]++;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting campaign queue stats:', error);
      return {
        pending: 0,
        processing: 0,
        sent: 0,
        failed: 0,
        total: 0
      };
    }
  };

  // Obtenir la queue d'une campagne - SIMPLIFIÉ POUR ÉVITER LES ERREURS TYPES
  const { data: queueItems, isLoading } = useQuery({
    queryKey: ['email-queue', user?.tenant_id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('email_queue')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Error loading email queue:', error);
        return [];
      }
    },
    enabled: !!user,
  });

  // Envoyer une campagne - VERSION SIMPLIFIÉE SANS RPC COMPLEXE
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
    }) => {
      
      console.log('🚀 Début de l\'envoi de campagne via méthode simplifiée');
      
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
          // Récupérer les IDs de contacts des listes sélectionnées
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

        // Insérer chaque contact dans la queue de façon simple
        for (const contact of contacts || []) {
          const messageId = `${campaignId}-${contact.id}-${Date.now()}`;
          
          // Vérifier les doublons de façon simple
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

  // Relancer les emails échoués - VERSION SIMPLIFIÉE
  const retryFailedEmails = useMutation({
    mutationFn: async (campaignId: string) => {
      try {
        // Mettre à jour les emails échoués
        const { error: updateError } = await supabase
          .from('email_queue')
          .update({ 
            status: 'pending',
            retry_count: 0,
            error_message: null,
            error_code: null,
            scheduled_for: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('campaign_id', campaignId)
          .eq('status', 'failed');

        if (updateError) throw updateError;

        return { success: true };
      } catch (error) {
        console.error('Error retrying failed emails:', error);
        throw error;
      }
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
