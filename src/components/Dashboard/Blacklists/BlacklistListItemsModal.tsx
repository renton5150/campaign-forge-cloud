
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBlacklists } from '@/hooks/useBlacklists';
import { useBlacklistItemLists } from '@/hooks/useBlacklistItemLists';
import { useToast } from '@/hooks/use-toast';
import { Mail, Globe, Search, Trash2, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface BlacklistListItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  list: any;
}

const BlacklistListItemsModal = ({ isOpen, onClose, list }: BlacklistListItemsModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToRemove, setItemToRemove] = useState<{ blacklistId: string; value: string } | null>(null);
  
  const { blacklists, isLoading } = useBlacklists();
  const { removeFromList } = useBlacklistItemLists();
  const { toast } = useToast();

  if (!list) return null;

  // Filtrer les éléments de blacklist qui sont associés à cette liste
  const listItems = blacklists.filter(item => {
    const hasListAssociation = (item as any).blacklist_item_lists?.some(
      (assoc: any) => assoc.blacklist_lists?.id === list.id
    );
    
    if (!hasListAssociation) return false;
    
    // Appliquer le filtre de recherche
    if (searchTerm) {
      return item.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
             item.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    }
    
    return true;
  });

  const handleRemoveFromList = async (blacklistId: string, value: string) => {
    try {
      await removeFromList.mutateAsync({
        blacklistId,
        listId: list.id
      });
      
      toast({
        title: "Élément retiré",
        description: `${value} a été retiré de la liste "${list.name}"`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de retirer l'élément de la liste",
        variant: "destructive",
      });
    }
    setItemToRemove(null);
  };

  const getTypeIcon = (type: string) => {
    return type === 'email' ? <Mail className="h-4 w-4" /> : <Globe className="h-4 w-4" />;
  };

  const getTypeColor = (type: string) => {
    return type === 'email' ? 'text-red-500' : 'text-orange-500';
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'bounce': return 'bg-red-100 text-red-800';
      case 'complaint': return 'bg-orange-100 text-orange-800';
      case 'competitor': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getTypeIcon(list.type)}
              Éléments de la liste "{list.name}"
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Informations sur la liste */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informations sur la liste</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Nom</p>
                    <p className="font-medium">{list.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Type</p>
                    <Badge variant="outline">
                      {list.type === 'email' ? 'Emails' : list.type === 'domain' ? 'Domaines' : 'Mixte'}
                    </Badge>
                  </div>
                  {list.description && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">Description</p>
                      <p className="text-sm">{list.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

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
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Éléments associés ({listItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Chargement...</p>
                  </div>
                ) : listItems.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      {searchTerm 
                        ? "Aucun élément ne correspond à votre recherche."
                        : "Aucun élément n'est associé à cette liste."
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {listItems.map((item) => {
                      const IconComponent = getTypeIcon(item.type);
                      const iconColor = getTypeColor(item.type);
                      
                      return (
                        <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center space-x-3 flex-1">
                            <span className={iconColor}>{IconComponent}</span>
                            <div className="flex-1">
                              <p className="font-medium">{item.value}</p>
                              {item.reason && (
                                <p className="text-sm text-gray-600">Raison : {item.reason}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                Ajouté le {new Date(item.created_at).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className={`capitalize ${getCategoryColor(item.category)}`}>
                              {item.category}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setItemToRemove({ blacklistId: item.id, value: item.value })}
                              className="text-red-600 hover:text-red-900"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!itemToRemove} onOpenChange={() => setItemToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer de la liste</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir retirer "{itemToRemove?.value}" de la liste "{list.name}" ?
              L'élément restera dans la blacklist générale mais ne sera plus associé à cette liste.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => itemToRemove && handleRemoveFromList(itemToRemove.blacklistId, itemToRemove.value)}
              className="bg-red-600 hover:bg-red-700"
            >
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BlacklistListItemsModal;
