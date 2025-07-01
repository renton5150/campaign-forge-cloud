import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useContactLists } from '@/hooks/useContactLists';
import { List, Plus, Search, Users, Calendar } from 'lucide-react';

const ContactsListsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { contactLists, isLoading, createContactList } = useContactLists();

  const filteredLists = contactLists?.filter(list => 
    list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    list.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Listes de contacts</h1>
          <p className="text-gray-600">Gérez vos listes de contacts et leurs membres</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle liste
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Rechercher des listes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <List className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total des listes</p>
                <p className="text-2xl font-bold">{contactLists?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total contacts</p>
                <p className="text-2xl font-bold">
                  {contactLists?.reduce((acc, list) => acc + (list.total_contacts || 0), 0) || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Listes actives</p>
                <p className="text-2xl font-bold">
                  {contactLists?.filter(list => !list.is_archived).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Badge className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Listes archivées</p>
                <p className="text-2xl font-bold">
                  {contactLists?.filter(list => list.is_archived).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Chargement des listes...</p>
          </div>
        ) : filteredLists.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <List className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">Aucune liste</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Aucune liste ne correspond à votre recherche.' : 'Commencez par créer votre première liste de contacts.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer une liste
                </Button>
              </div>
            )}
          </div>
        ) : (
          filteredLists.map((list) => (
            <Card key={list.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{list.name}</CardTitle>
                    {list.description && (
                      <CardDescription className="mt-1">{list.description}</CardDescription>
                    )}
                  </div>
                  {list.is_archived && (
                    <Badge variant="secondary">Archivée</Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center">
                    <Users className="mr-1 h-4 w-4" />
                    <span>{list.total_contacts || 0} contacts</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="mr-1 h-4 w-4" />
                    <span>{new Date(list.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                
                {list.tags && list.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {list.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {list.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{list.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ContactsListsPage;