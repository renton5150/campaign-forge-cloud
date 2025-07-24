
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useBlacklistItemLists } from '@/hooks/useBlacklistItemLists';
import { useToast } from '@/hooks/use-toast';
import { Search, Mail, Globe, Trash2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface BlacklistListItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  list: {
    id: string;
    name: string;
    type: string;
    description?: string;
  } | null;
}

const BlacklistListItemsModal = ({ isOpen, onClose, list }: BlacklistListItemsModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToRemove, setItemToRemove] = useState<{ blacklistId: string; listId: string } | null>(null);
  
  const { getBlacklistListItems, removeFromList } = useBlacklistItemLists();
  const { toast } = useToast();

  const { data: items = [], isLoading } = getBlacklistListItems(list?.id || '');

  const filteredItems = items.filter((item: any) => {
    const blacklistItem = item.blacklists;
    if (!blacklistItem) return false;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      blacklistItem.value.toLowerCase().includes(searchLower) ||
      blacklistItem.reason?.toLowerCase().includes(searchLower) ||
      blacklistItem.category.toLowerCase().includes(searchLower)
    );
  });

  const handleRemoveItem = async (blacklistId: string, listId: string) => {
    try {
      await removeFromList.mutateAsync({ blacklistId, listId });
      toast({
        title: "Élément supprimé",
        description: "L'élément a été supprimé de la liste",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'élément",
        variant: "destructive",
      });
    }
    setItemToRemove(null);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'bounce': return 'bg-red-100 text-red-800';
      case 'complaint': return 'bg-orange-100 text-orange-800';
      case 'competitor': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!list) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>
              Éléments de la liste : {list.name}
            </DialogTitle>
            {list.description && (
              <p className="text-sm text-gray-600">{list.description}</p>
            )}
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Barre de recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Rechercher dans les éléments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Liste des éléments */}
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Chargement...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">
                    {searchTerm ? 'Aucun résultat' : 'Aucun élément'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm 
                      ? 'Aucun élément ne correspond à votre recherche.'
                      : 'Cette liste ne contient aucun élément blacklisté.'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredItems.map((item: any) => {
                    const blacklistItem = item.blacklists;
                    if (!blacklistItem) return null;
                    
                    const IconComponent = blacklistItem.type === 'email' ? Mail : Globe;
                    const iconColor = blacklistItem.type === 'email' ? 'text-red-500' : 'text-orange-500';
                    
                    return (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center space-x-3 flex-1">
                          <IconComponent className={`h-5 w-5 ${iconColor}`} />
                          <div className="flex-1">
                            <p className="font-medium">{blacklistItem.value}</p>
                            {blacklistItem.reason && (
                              <p className="text-sm text-gray-600">Raison : {blacklistItem.reason}</p>
                            )}
                            <p className="text-xs text-gray-500">
                              Ajouté le {new Date(blacklistItem.created_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          <Badge variant="outline" className={`capitalize ${getCategoryColor(blacklistItem.category)}`}>
                            {blacklistItem.category}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setItemToRemove({ blacklistId: blacklistItem.id, listId: list.id })}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={onClose}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!itemToRemove} onOpenChange={() => setItemToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cet élément de la liste ? 
              L'élément restera dans la blacklist mais ne sera plus associé à cette liste.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => itemToRemove && handleRemoveItem(itemToRemove.blacklistId, itemToRemove.listId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BlacklistListItemsModal;
