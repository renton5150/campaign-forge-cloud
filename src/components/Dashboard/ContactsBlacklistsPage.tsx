import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useBlacklists } from '@/hooks/useBlacklists';
import { useToast } from '@/hooks/use-toast';
import { Shield, Plus, Search, Mail, Globe, AlertTriangle, Trash2, MoreHorizontal, Upload, FolderOpen, List } from 'lucide-react';
import AddToBlacklistModal from './Blacklists/AddToBlacklistModal';
import BulkImportModal from './Blacklists/BulkImportModal';
import BlacklistListsManagement from './Blacklists/BlacklistListsManagement';
import BlacklistItemListsModal from './Blacklists/BlacklistItemListsModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const ContactsBlacklistsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [showItemListsModal, setShowItemListsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: string; type: 'email' | 'domain'; value: string } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('blacklists');
  
  const { blacklists, isLoading, removeFromBlacklist } = useBlacklists();
  const { toast } = useToast();

  const emailBlacklists = blacklists?.filter(item => item.type === 'email') || [];
  const domainBlacklists = blacklists?.filter(item => item.type === 'domain') || [];

  const filteredEmailBlacklists = emailBlacklists.filter(item =>
    item.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDomainBlacklists = domainBlacklists.filter(item =>
    item.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteItem = async (id: string) => {
    try {
      await removeFromBlacklist.mutateAsync(id);
      toast({
        title: "Supprimé",
        description: "L'élément a été supprimé de la blacklist",
      });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'élément",
        variant: "destructive",
      });
    }
    setItemToDelete(null);
  };

  const handleManageLists = (item: any) => {
    setSelectedItem({
      id: item.id,
      type: item.type,
      value: item.value
    });
    setShowItemListsModal(true);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'bounce': return 'bg-red-100 text-red-800';
      case 'complaint': return 'bg-orange-100 text-orange-800';
      case 'competitor': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderBlacklistItems = (items: typeof blacklists, type: 'email' | 'domain') => {
    if (isLoading) {
      return (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Chargement...</p>
        </div>
      );
    }

    if (items.length === 0) {
      const IconComponent = type === 'email' ? Mail : Globe;
      return (
        <div className="text-center py-12">
          <IconComponent className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">
            Aucun {type === 'email' ? 'email' : 'domaine'} blacklisté
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm 
              ? `Aucun ${type === 'email' ? 'email' : 'domaine'} ne correspond à votre recherche.`
              : `Aucun ${type === 'email' ? 'email' : 'domaine'} n'est actuellement blacklisté.`
            }
          </p>
          <div className="mt-6">
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un {type === 'email' ? 'email' : 'domaine'}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {items.map((item) => {
          const IconComponent = item.type === 'email' ? Mail : Globe;
          const iconColor = item.type === 'email' ? 'text-red-500' : 'text-orange-500';
          const associatedLists = (item as any).blacklist_item_lists || [];
          
          return (
            <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center space-x-3 flex-1">
                <IconComponent className={`h-5 w-5 ${iconColor}`} />
                <div className="flex-1">
                  <p className="font-medium">{item.value}</p>
                  {item.reason && (
                    <p className="text-sm text-gray-600">Raison : {item.reason}</p>
                  )}
                  {associatedLists.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {associatedLists.map((listAssoc: any) => (
                        <Badge key={listAssoc.id} variant="secondary" className="text-xs">
                          {listAssoc.blacklist_lists?.name}
                        </Badge>
                      ))}
                    </div>
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleManageLists(item)}>
                      <List className="mr-2 h-4 w-4" />
                      Gérer les listes
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setItemToDelete(item.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blacklists</h1>
          <p className="text-gray-600">Gérez les emails et domaines bloqués</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setShowBulkImportModal(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import en masse
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter à la blacklist
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Mail className="h-8 w-8 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Emails bloqués</p>
                <p className="text-2xl font-bold">{emailBlacklists.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Globe className="h-8 w-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Domaines bloqués</p>
                <p className="text-2xl font-bold">{domainBlacklists.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total protégé</p>
                <p className="text-2xl font-bold">{blacklists?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="blacklists" className="flex items-center">
            <Shield className="mr-2 h-4 w-4" />
            Blacklists
          </TabsTrigger>
          <TabsTrigger value="lists" className="flex items-center">
            <FolderOpen className="mr-2 h-4 w-4" />
            Listes
          </TabsTrigger>
          <TabsTrigger value="emails" className="flex items-center">
            <Mail className="mr-2 h-4 w-4" />
            Emails ({emailBlacklists.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="blacklists" className="mt-6">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Rechercher dans les blacklists..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Tabs defaultValue="emails" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="emails" className="flex items-center">
                <Mail className="mr-2 h-4 w-4" />
                Emails ({emailBlacklists.length})
              </TabsTrigger>
              <TabsTrigger value="domains" className="flex items-center">
                <Globe className="mr-2 h-4 w-4" />
                Domaines ({domainBlacklists.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="emails" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Emails blacklistés</CardTitle>
                  <CardDescription>
                    Liste des adresses email bloquées pour vos campagnes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {renderBlacklistItems(filteredEmailBlacklists, 'email')}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="domains" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Domaines blacklistés</CardTitle>
                  <CardDescription>
                    Liste des domaines bloqués pour vos campagnes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {renderBlacklistItems(filteredDomainBlacklists, 'domain')}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="lists" className="mt-6">
          <BlacklistListsManagement />
        </TabsContent>

        <TabsContent value="emails" className="mt-6">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Rechercher dans les emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Emails blacklistés</CardTitle>
              <CardDescription>
                Liste des adresses email bloquées pour vos campagnes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderBlacklistItems(filteredEmailBlacklists, 'email')}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AddToBlacklistModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      <BulkImportModal
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
      />

      <BlacklistItemListsModal
        isOpen={showItemListsModal}
        onClose={() => setShowItemListsModal(false)}
        blacklistItem={selectedItem}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cet élément de la blacklist ? Cette action ne peut pas être annulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => itemToDelete && handleDeleteItem(itemToDelete)}
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

export default ContactsBlacklistsPage;
