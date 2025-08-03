
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

interface CampaignSendButtonProps {
  campaign: Campaign;
}

export function CampaignSendButton({ campaign }: CampaignSendButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const { contactLists } = useContactLists();
  const { queueCampaign, isQueueing } = useEmailQueueNew(); // Système professionnel
  const { processQueue, isProcessing } = useQueueProcessor(); // Processeur professionnel
  const { toast } = useToast();

  const handleSend = async () => {
    if (selectedLists.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins une liste de contacts",
        variant: "destructive",
      });
      return;
    }

    try {
      // Étape 1: Mettre en queue avec le système professionnel
      const result = await queueCampaign({
        campaignId: campaign.id,
        contactListIds: selectedLists
      });

      const queuedEmails = result?.queued_emails || 0;
      const message = result?.message || `${queuedEmails} emails ajoutés à la queue d'envoi`;

      toast({
        title: "✅ Campagne mise en queue (système professionnel)",
        description: message,
      });

      // Étape 2: Démarrer le traitement automatique avec le processeur professionnel
      if (queuedEmails > 0) {
        toast({
          title: "🚀 Traitement démarré",
          description: "Le système professionnel traite vos emails...",
        });
        
        try {
          await processQueue.mutateAsync();
        } catch (processingError) {
          console.warn('Processing started in background:', processingError);
          // Le traitement continue en arrière-plan même si cette promesse échoue
        }
      }

      setIsDialogOpen(false);
      setSelectedLists([]);
    } catch (error: any) {
      console.error('Error sending campaign with professional system:', error);
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
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
              {contactLists?.map((list) => (
                <div key={list.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={list.id}
                    checked={selectedLists.includes(list.id)}
                    onCheckedChange={() => toggleList(list.id)}
                  />
                  <Label 
                    htmlFor={list.id} 
                    className="text-sm cursor-pointer flex-1"
                  >
                    {list.name}
                    <span className="text-gray-500 ml-2">
                      ({list.total_contacts || 0} contacts)
                    </span>
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          {selectedLists.length > 0 && (
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>{selectedLists.length}</strong> liste(s) sélectionnée(s)<br/>
                Le système professionnel garantit un envoi optimal.
              </p>
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button 
              onClick={handleSend}
              disabled={isLoading || selectedLists.length === 0}
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
                  Envoyer avec Pro System
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
