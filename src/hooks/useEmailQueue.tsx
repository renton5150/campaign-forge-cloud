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
      stats[item.status as keyof Omit<QueueStats, 'total'>]++;
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
          *,
          campaigns!inner(tenant_id)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as EmailQueueItem[];
    },
    enabled: !!user,
  });

  // Envoyer une campagne (créer les entrées en queue)
  const sendCampaign = useMutation({
    mutationFn: async ({ 
      campaignId, 
      subject, 
      htmlContent, 
      contactListIds 
    }: { 
      campaignId: string; 
      subject: string; 
      htmlContent: string; 
      contactListIds: string[];
    }) => {
      // Récupérer tous les contacts des listes sélectionnées
      const { data: contacts, error: contactError } = await supabase
        .from('contact_list_memberships')
        .select(`
          contacts!inner(
            id,
            email,
            first_name,
            last_name,
            status
          )
        `)
        .in('list_id', contactListIds)
        .eq('contacts.status', 'active');

      if (contactError) throw contactError;

      if (!contacts || contacts.length === 0) {
        throw new Error('Aucun contact actif trouvé dans les listes sélectionnées');
      }

      // Créer les entrées en queue
      const timestamp = new Date().getTime();
      const queueEntries = contacts.map((contact: any, index: number) => {
        const contactData = contact.contacts;
        const contactName = contactData.first_name || contactData.last_name 
          ? `${contactData.first_name || ''} ${contactData.last_name || ''}`.trim()
          : null;

        return {
          campaign_id: campaignId,
          contact_email: contactData.email,
          contact_name: contactName,
          subject: subject,
          html_content: htmlContent,
          message_id: `${campaignId}-${contactData.email}-${timestamp}-${index}`,
          status: 'pending' as const,
          scheduled_for: new Date().toISOString(),
        };
      });

      const { data, error } = await supabase
        .from('email_queue')
        .insert(queueEntries)
        .select();

      if (error) throw error;

      return {
        queued: queueEntries.length,
        uniqueContacts: new Set(contacts.map((c: any) => c.contacts.email)).size
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
            retry_count: email.retry_count + 1,
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