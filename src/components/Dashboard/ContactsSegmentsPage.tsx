import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Filter, Plus, Search, Users, Zap, Calendar } from 'lucide-react';

const ContactsSegmentsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data pour les segments
  const segments = [
    {
      id: '1',
      name: 'Contacts actifs',
      description: 'Contacts ayant ouvert un email dans les 30 derniers jours',
      contact_count: 2450,
      is_dynamic: true,
      created_at: '2024-01-15',
      rules: { engagement: 'high' }
    },
    {
      id: '2', 
      name: 'Nouveaux abonnés',
      description: 'Contacts ajoutés dans les 7 derniers jours',
      contact_count: 125,
      is_dynamic: true,
      created_at: '2024-01-10',
      rules: { date_added: '7_days' }
    },
    {
      id: '3',
      name: 'Entreprises tech',
      description: 'Contacts travaillant dans des entreprises technologiques',
      contact_count: 890,
      is_dynamic: false,
      created_at: '2024-01-05',
      rules: { company_type: 'tech' }
    }
  ];

  const filteredSegments = segments.filter(segment =>
    segment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    segment.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Segments de contacts</h1>
          <p className="text-gray-600">Créez et gérez des segments intelligents pour vos campagnes</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau segment
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Filter className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total segments</p>
                <p className="text-2xl font-bold">{segments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Segments dynamiques</p>
                <p className="text-2xl font-bold">
                  {segments.filter(s => s.is_dynamic).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Contacts segmentés</p>
                <p className="text-2xl font-bold">
                  {segments.reduce((acc, seg) => acc + seg.contact_count, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Segments statiques</p>
                <p className="text-2xl font-bold">
                  {segments.filter(s => !s.is_dynamic).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Rechercher des segments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Segments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSegments.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Filter className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">Aucun segment</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Aucun segment ne correspond à votre recherche.' : 'Commencez par créer votre premier segment de contacts.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un segment
                </Button>
              </div>
            )}
          </div>
        ) : (
          filteredSegments.map((segment) => (
            <Card key={segment.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center">
                      {segment.name}
                      {segment.is_dynamic && (
                        <Zap className="ml-2 h-4 w-4 text-orange-500" />
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {segment.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Contacts</span>
                    <Badge variant="outline" className="font-mono">
                      {segment.contact_count.toLocaleString()}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Type</span>
                    <Badge 
                      variant={segment.is_dynamic ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {segment.is_dynamic ? 'Dynamique' : 'Statique'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Créé le</span>
                    <span className="text-sm text-gray-900">
                      {new Date(segment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="pt-3 border-t">
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        Modifier
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        Dupliquer
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>Créez rapidement des segments prédéfinis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center">
              <Users className="h-6 w-6 mb-2" />
              <span className="text-sm">Contacts actifs</span>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center">
              <Calendar className="h-6 w-6 mb-2" />
              <span className="text-sm">Nouveaux contacts</span>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center">
              <Zap className="h-6 w-6 mb-2" />
              <span className="text-sm">Très engagés</span>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center">
              <Filter className="h-6 w-6 mb-2" />
              <span className="text-sm">Segment personnalisé</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactsSegmentsPage;