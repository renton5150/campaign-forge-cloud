import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBlacklists } from '@/hooks/useBlacklists';
import { Shield, Plus, Search, Mail, Globe, AlertTriangle } from 'lucide-react';

const ContactsBlacklistsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { blacklists, isLoading } = useBlacklists();

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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blacklists</h1>
          <p className="text-gray-600">Gérez les emails et domaines bloqués</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter à la blacklist
        </Button>
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

      {/* Tabs */}
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
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Chargement...</p>
                </div>
              ) : filteredEmailBlacklists.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">Aucun email blacklisté</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm ? 'Aucun email ne correspond à votre recherche.' : 'Aucun email n\'est actuellement blacklisté.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEmailBlacklists.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <div>
                          <p className="font-medium">{item.value}</p>
                          {item.reason && (
                            <p className="text-sm text-gray-600">Raison : {item.reason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="capitalize">
                          {item.category || 'Manuel'}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Chargement...</p>
                </div>
              ) : filteredDomainBlacklists.length === 0 ? (
                <div className="text-center py-12">
                  <Globe className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">Aucun domaine blacklisté</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm ? 'Aucun domaine ne correspond à votre recherche.' : 'Aucun domaine n\'est actuellement blacklisté.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDomainBlacklists.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Globe className="h-5 w-5 text-orange-500" />
                        <div>
                          <p className="font-medium">{item.value}</p>
                          {item.reason && (
                            <p className="text-sm text-gray-600">Raison : {item.reason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="capitalize">
                          {item.category || 'Manuel'}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContactsBlacklistsPage;