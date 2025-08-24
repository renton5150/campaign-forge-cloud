
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { useQueueProcessor } from '@/hooks/useQueueProcessor';
import { useEmailQueueNew } from '@/hooks/useEmailQueueNew';
import { useToast } from '@/hooks/use-toast';
import { Campaign } from '@/types/database';

interface CampaignSendButtonProps {
  campaign: Campaign;
}

export function CampaignSendButton({ campaign }: CampaignSendButtonProps) {
  const { queueCampaign, isQueueing } = useEmailQueueNew();
  const { processQueue, isProcessing } = useQueueProcessor();
  const { toast } = useToast();

  const handleSend = async () => {
    try {
      console.log('🚀 Envoi direct de la campagne:', campaign.name);
      
      // Étape 1: Mettre en queue automatiquement avec les listes associées
      const result = await queueCampaign({
        campaignId: campaign.id,
        contactListIds: [] // Le RPC va charger automatiquement les listes depuis campaign_lists
      });

      const queuedEmails = result?.queued_emails || 0;
      
      if (queuedEmails === 0) {
        // Afficher un avertissement mais continuer le traitement pour les emails déjà en attente
        toast({
          title: "Aucun nouvel email mis en queue",
          description: "Aucun contact nouveau n'a été ajouté (doublons/blacklist). Tentative d'envoi des emails déjà en attente...",
        });
        console.log('ℹ️ Aucun nouvel email mis en queue, tentative de traitement des emails existants...');
        // NE PAS retourner ici: on poursuit avec le traitement de la queue
      }

      toast({
        title: "✅ Campagne mise en queue",
        description: result?.message || `${queuedEmails} emails mis en queue`,
      });

      // Étape 2: Traitement automatique
      try {
        const processResult = await processQueue.mutateAsync();
        
        if (processResult?.succeeded > 0) {
          toast({
            title: "✅ Emails envoyés",
            description: `${processResult.succeeded} emails envoyés avec succès`,
          });
        }
      } catch (processingError: any) {
        console.error('Erreur lors du traitement de la queue:', processingError);
        toast({
          title: "Queue créée mais traitement échoué",
          description: "Les emails sont en queue. Vérifiez la configuration SMTP.",
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error('Error sending campaign:', error);
      toast({
        title: "Erreur",
        description: error?.message || "Erreur lors de l'envoi",
        variant: "destructive",
      });
    }
  };

  const canSend = campaign.status === 'draft' || campaign.status === 'scheduled';

  if (!canSend) {
    return (
      <Button 
        disabled 
        size="sm" 
        variant="outline"
        className="text-gray-500"
      >
        {campaign.status === 'sent' ? 'Déjà envoyée' : 'Non disponible'}
      </Button>
    );
  }

  const isLoading = isQueueing || isProcessing;

  return (
    <Button 
      size="sm" 
      className="bg-green-600 hover:bg-green-700"
      disabled={isLoading}
      onClick={handleSend}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {isQueueing ? 'Mise en queue...' : 'Envoi...'}
        </>
      ) : (
        <>
          <Send className="h-4 w-4 mr-2" />
          Envoyer
        </>
      )}
    </Button>
  );
}
