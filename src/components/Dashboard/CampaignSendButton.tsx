
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Send, Loader2 } from 'lucide-react';
import { useContactLists } from '@/hooks/useContactLists';
import { useQueueProcessor } from '@/hooks/useQueueProcessor';
import { useEmailQueueNew } from '@/hooks/useEmailQueueNew';
import { useToast } from '@/hooks/use-toast';
import { Campaign } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';

interface CampaignSendButtonProps {
  campaign: Campaign;
}

export function CampaignSendButton({ campaign }: CampaignSendButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const { contactLists } = useContactLists();
  const { queueCampaign, isQueueing } = useEmailQueueNew(); // Système professionnel
  const { processQueue, isProcessing } = useQueueProcessor(); // Processeur professionnel
  const { toast } = useToast();

  // Charger les listes sélectionnées depuis la base de données quand le dialog s'ouvre
  const loadCampaignLists = async () => {
    if (!campaign?.id) return;
    
    setIsLoadingLists(true);
    try {
      const { data, error } = await supabase
        .from('campaign_lists')
        .select('list_id')
        .eq('campaign_id', campaign.id);
      
      if (error) throw error;
      
      const listIds = data?.map(item => item.list_id) || [];
      setSelectedLists(listIds);
      
      console.log('🔄 Listes chargées pour la campagne:', listIds);
    } catch (error: any) {
      console.error('Erreur lors du chargement des listes:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les listes sélectionnées",
        variant: "destructive",
      });
    } finally {
      setIsLoadingLists(false);
    }
  };

  // Charger les listes quand le dialog s'ouvre
  const handleDialogOpen = (open: boolean) => {
    setIsDialogOpen(open);
    if (open) {
      loadCampaignLists();
    }
  };

  // Sauvegarder les listes sélectionnées dans campaign_lists
  const saveCampaignLists = async () => {
    if (!campaign?.id) return;
    
    try {
      // Supprimer les anciennes associations
      await supabase
        .from('campaign_lists')
        .delete()
        .eq('campaign_id', campaign.id);
      
      // Ajouter les nouvelles associations
      if (selectedLists.length > 0) {
        const campaignListsData = selectedLists.map(listId => ({
          campaign_id: campaign.id,
          list_id: listId,
          added_at: new Date().toISOString()
        }));
        
        const { error } = await supabase
          .from('campaign_lists')
          .insert(campaignListsData);
        
        if (error) throw error;
      }
      
      console.log('✅ Listes de campagne sauvegardées:', selectedLists);
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde des listes:', error);
      throw error;
    }
  };

  const handleSend = async () => {
    try {
      // Sauvegarder les listes sélectionnées dans campaign_lists d'abord
      await saveCampaignLists();
      
      // Étape 1: Mettre en queue avec le système RPC professionnel
      // Si aucune liste sélectionnée, le RPC chargera automatiquement les listes sauvegardées
      const result = await queueCampaign({
        campaignId: campaign.id,
        contactListIds: selectedLists
      });

      const queuedEmails = result?.queued_emails || 0;
      const duplicatesSkipped = result?.duplicates_skipped || 0;
      
      let message = result?.message || `${queuedEmails} emails mis en queue`;
      
      if (queuedEmails === 0) {
        toast({
          title: "Aucun email à envoyer",
          description: "Aucun contact actif trouvé dans les listes sélectionnées ou tous les emails sont déjà en queue/envoyés.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "✅ Campagne mise en queue",
        description: message,
      });

      // Étape 2: Démarrer le traitement automatique
      if (queuedEmails > 0) {
        toast({
          title: "🚀 Traitement démarré",
          description: "Envoi des emails en cours...",
        });
        
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
            title: "Traitement non démarré",
            description: processingError?.message || "Aucun serveur SMTP configuré. Vérifiez la configuration SMTP.",
            variant: "destructive",
          });
        }
      }

      handleDialogOpen(false);
      setSelectedLists([]);
    } catch (error: any) {
      console.error('Error sending campaign:', error);
      toast({
        title: "Erreur",
        description: error?.message || "Erreur lors de la mise en queue",
        variant: "destructive",
      });
    }
  };

  const toggleList = (listId: string) => {
    setSelectedLists(prev => 
      prev.includes(listId) 
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    );
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
    <Dialog open={isDialogOpen} onOpenChange={handleDialogOpen}>
      <DialogTrigger asChild>
        <Button 
          size="sm" 
          className="bg-green-600 hover:bg-green-700"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isQueueing ? 'Mise en queue...' : 'Envoi...'}
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Envoyer (Pro)
            </>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Envoyer la campagne (Système Professionnel)</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Fonctionnalités Pro:</strong><br/>
              ✅ Anti-doublon intelligent<br/>
              ✅ Rate limiting automatique<br/>
              ✅ Retry avec backoff exponentiel<br/>
              ✅ Traitement parallèle haute performance
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Campagne :</h4>
            <p className="text-sm text-gray-600">{campaign.name}</p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-3">
              Sélectionner les listes de contacts :
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {isLoadingLists ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-gray-600">Chargement des listes...</span>
                </div>
              ) : (
                contactLists?.map((list) => (
                  <div key={list.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={list.id}
                      checked={selectedLists.includes(list.id)}
                      onCheckedChange={() => toggleList(list.id)}
                      disabled={isLoadingLists}
                    />
                    <Label 
                      htmlFor={list.id} 
                      className="text-sm cursor-pointer flex-1"
                    >
                      {list.name}
                      <span className={`ml-2 ${(list.total_contacts || 0) === 0 ? 'text-red-500' : 'text-gray-500'}`}>
                        ({list.total_contacts || 0} contacts)
                        {(list.total_contacts || 0) === 0 && ' - Liste vide!'}
                      </span>
                    </Label>
                  </div>
                ))
              )}
            </div>
            
            {selectedLists.length === 0 && !isLoadingLists && (
              <div className="bg-blue-50 p-3 rounded-lg mt-3">
                <p className="text-sm text-blue-800">
                  💡 <strong>Info:</strong> Si aucune liste n'est sélectionnée, le système utilisera automatiquement les listes précédemment associées à cette campagne.
                </p>
              </div>
            )}
          </div>
          
          {selectedLists.length > 0 && (
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>{selectedLists.length}</strong> liste(s) sélectionnée(s)<br/>
                Le système RPC garantit un envoi optimal et sécurisé.
              </p>
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => handleDialogOpen(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button 
              onClick={handleSend}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isQueueing ? 'Mise en queue...' : 'Traitement...'}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer avec RPC System
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
