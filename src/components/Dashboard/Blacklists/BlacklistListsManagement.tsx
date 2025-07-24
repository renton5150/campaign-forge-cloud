
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useBlacklistLists } from '@/hooks/useBlacklistLists';
import { useToast } from '@/hooks/use-toast';
import { Plus, FolderOpen, Edit, Trash2, MoreHorizontal, Mail, Globe, FileText } from 'lucide-react';
import BlacklistListModal from './BlacklistListModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const BlacklistListsManagement = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [listToDelete, setListToDelete] = useState<string | null>(null);
  
  const { blacklistLists, isLoading, deleteBlacklistList } = useBlacklistLists();
  const { toast } = useToast();

  const handleEdit = (list: any) => {
    setEditingList(list);
    setShowModal(true);
  };

  const handleDelete = async (listId: string) => {
    try {
      await deleteBlacklistList.mutateAsync(listId);
      toast({
        title: "Liste supprimée",
        description: "La liste de blacklist a été supprimée avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer la liste",
        variant: "destructive",
      });
    }
    setListToDelete(null);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingList(null);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'domain': return <Globe className="h-4 w-4" />;
      case 'mixed': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'email': return 'Emails';
      case 'domain': return 'Domaines';
      case 'mixed': return 'Mixte';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'email': return 'bg-red-100 text-red-800';
      case 'domain': return 'bg-orange-100 text-orange-800';
      case 'mixed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Chargement des listes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Listes de blacklist</h2>
          <p className="text-gray-600">Organisez vos blacklists par catégories</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Créer une liste
        </Button>
      </div>

      {/* Listes */}
      {blacklistLists.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FolderOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">
              Aucune liste de blacklist
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Créez votre première liste pour organiser vos blacklists.
            </p>
            <div className="mt-6">
              <Button onClick={() => setShowModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Créer une liste
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {blacklistLists.map((list) => (
            <Card key={list.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(list.type)}
                    <CardTitle className="text-lg">{list.name}</CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(list)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setListToDelete(list.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {list.description && (
                  <CardDescription className="text-sm">
                    {list.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={getTypeColor(list.type)}>
                    {getTypeLabel(list.type)}
                  </Badge>
                  <Badge variant={list.is_active ? "default" : "secondary"}>
                    {list.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Créée le {new Date(list.created_at).toLocaleDateString('fr-FR')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de création/édition */}
      <BlacklistListModal
        isOpen={showModal}
        onClose={handleModalClose}
        list={editingList}
      />

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!listToDelete} onOpenChange={() => setListToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette liste de blacklist ? 
              Cette action ne peut pas être annulée et tous les éléments de cette liste seront dissociés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => listToDelete && handleDelete(listToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BlacklistListsManagement;
