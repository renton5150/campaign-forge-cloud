
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useBlacklistItemLists } from '@/hooks/useBlacklistItemLists';
import { useBlacklistLists } from '@/hooks/useBlacklistLists';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BlacklistItemListsModalProps {
  isOpen: boolean;
  onClose: () => void;
  blacklistItem: {
    id: string;
    type: 'email' | 'domain';
    value: string;
  } | null;
}

const BlacklistItemListsModal = ({ isOpen, onClose, blacklistItem }: BlacklistItemListsModalProps) => {
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { blacklistLists } = useBlacklistLists();
  const { addToList, removeFromList, getBlacklistItemLists } = useBlacklistItemLists();
  const { toast } = useToast();

  // Récupérer les listes actuelles de l'élément
  const { data: currentLists } = getBlacklistItemLists(blacklistItem?.id || '');

  // Filtrer les listes selon le type de l'élément
  const filteredLists = blacklistLists.filter(list => 
    list.type === blacklistItem?.type || list.type === 'mixed'
  );

  useEffect(() => {
    if (currentLists && Array.isArray(currentLists)) {
      const currentListIds = currentLists.map((item: any) => item.blacklist_list_id);
      setSelectedListIds(currentListIds);
    }
  }, [currentLists]);

  const handleListSelection = (listId: string, checked: boolean) => {
    if (checked) {
      setSelectedListIds(prev => [...prev, listId]);
    } else {
      setSelectedListIds(prev => prev.filter(id => id !== listId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blacklistItem) return;

    setIsLoading(true);
    setError(null);

    try {
      const currentListIds = (Array.isArray(currentLists) ? currentLists : [])
        .map((item: any) => item.blacklist_list_id) || [];
      
      // Listes à ajouter
      const listsToAdd = selectedListIds.filter(id => !currentListIds.includes(id));
      
      // Listes à supprimer
      const listsToRemove = currentListIds.filter(id => !selectedListIds.includes(id));

      // Ajouter aux nouvelles listes
      for (const listId of listsToAdd) {
        try {
          await addToList.mutateAsync({
            blacklistId: blacklistItem.id,
            listId
          });
        } catch (addError) {
          console.error('Error adding to list:', addError);
          // Continuer avec les autres listes même si une échoue
        }
      }

      // Supprimer des anciennes listes
      for (const listId of listsToRemove) {
        try {
          await removeFromList.mutateAsync({
            blacklistId: blacklistItem.id,
            listId
          });
        } catch (removeError) {
          console.error('Error removing from list:', removeError);
          // Continuer avec les autres listes même si une échoue
        }
      }

      toast({
        title: "Listes mises à jour",
        description: `Les associations ont été mises à jour avec succès`,
      });

      onClose();
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour des listes:', error);
      const errorMessage = error.message || "Une erreur est survenue lors de la mise à jour des listes";
      setError(errorMessage);
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedListIds([]);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!blacklistItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            Gérer les listes - {blacklistItem.value}
          </DialogTitle>
        </DialogHeader>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Listes disponibles</Label>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {filteredLists.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Aucune liste disponible pour ce type d'élément
                </p>
              ) : (
                filteredLists.map((list) => (
                  <div key={list.id} className="flex items-center space-x-2 p-2 border rounded">
                    <Checkbox
                      id={list.id}
                      checked={selectedListIds.includes(list.id)}
                      onCheckedChange={(checked) => handleListSelection(list.id, checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={list.id} className="text-sm font-medium cursor-pointer">
                        {list.name}
                      </Label>
                      {list.description && (
                        <p className="text-xs text-gray-500">{list.description}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mettre à jour
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BlacklistItemListsModal;
