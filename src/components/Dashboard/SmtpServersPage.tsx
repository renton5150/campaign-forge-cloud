
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSmtpServers, SmtpServer } from '@/hooks/useSmtpServers';
import { useSendingDomains } from '@/hooks/useSendingDomains';
import { useToast } from '@/hooks/use-toast';
import { Edit, Trash2, Plus, TestTube, Mail, Link2 } from 'lucide-react';
import SmtpConfigurationModal from './SmtpConfigurationModal';
import SmtpConnectionDiagnostic from './SmtpConnectionDiagnostic';
import SmtpTestEmailModal from './SmtpTestEmailModal';

export default function SmtpServersPage() {
  const { servers, loading, createServer, updateServer, deleteServer } = useSmtpServers();
  const { domains } = useSendingDomains();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<SmtpServer | undefined>();
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const [isTestEmailOpen, setIsTestEmailOpen] = useState(false);

  const getLinkedDomain = (serverId: string) => {
    return domains.find(domain => domain.id === serverId);
  };

  const handleEdit = (server: SmtpServer) => {
    setSelectedServer(server);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedServer(undefined);
    setIsModalOpen(true);
  };

  const handleSave = async (data: any) => {
    try {
      if (selectedServer) {
        await updateServer(selectedServer.id, data);
      } else {
        await createServer(data);
      }
      setIsModalOpen(false);
      setSelectedServer(undefined);
    } catch (error) {
      console.error('Error saving server:', error);
    }
  };

  const handleDelete = async (serverId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce serveur ?')) {
      await deleteServer(serverId);
    }
  };

  const handleTest = (server: SmtpServer) => {
    setSelectedServer(server);
    setIsDiagnosticOpen(true);
  };

  const handleTestEmail = (server: SmtpServer) => {
    setSelectedServer(server);
    setIsTestEmailOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedServer(undefined);
  };

  const handleCloseDiagnostic = () => {
    setIsDiagnosticOpen(false);
    setSelectedServer(undefined);
  };

  const handleCloseTestEmail = () => {
    setIsTestEmailOpen(false);
    setSelectedServer(undefined);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">📮 Serveurs SMTP</h1>
            <p className="text-gray-600">Chargement des serveurs d'envoi d'emails...</p>
          </div>
        </div>
        
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3">Chargement en cours...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">📮 Serveurs SMTP</h1>
          <p className="text-gray-600">Configurez vos serveurs d'envoi d'emails</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un serveur
        </Button>
      </div>

      <div className="grid gap-6">
        {servers.map((server) => {
          const linkedDomain = getLinkedDomain(server.sending_domain_id || '');
          
          return (
            <Card key={server.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {server.name}
                    <Badge variant={server.is_active ? "default" : "secondary"}>
                      {server.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                    {linkedDomain && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <Link2 className="h-3 w-3 mr-1" />
                        {linkedDomain.domain}
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTest(server)}
                    >
                      <TestTube className="w-4 h-4 mr-2" />
                      Test Connexion
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestEmail(server)}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Envoyer Test
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(server)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(server.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Type</p>
                    <p className="font-medium">{server.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Hôte</p>
                    <p className="font-medium">{server.host}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Port</p>
                    <p className="font-medium">{server.port}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Chiffrement</p>
                    <p className="font-medium">{server.encryption || 'Aucun'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Nom expéditeur</p>
                    <p className="font-medium">{server.from_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email expéditeur</p>
                    <p className="font-medium">{server.from_email}</p>
                  </div>
                </div>
                
                {!linkedDomain && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Ce serveur n'est pas encore lié à un domaine d'envoi. 
                      Créez un domaine pour l'authentifier avec DKIM/SPF.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {servers.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-lg text-gray-500">Aucun serveur SMTP configuré</p>
            <p className="text-sm text-gray-400 mb-4">
              Créez votre premier serveur SMTP pour commencer à envoyer des emails
            </p>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Créer un serveur SMTP
            </Button>
          </CardContent>
        </Card>
      )}

      <SmtpConfigurationModal
        open={isModalOpen}
        onClose={handleCloseModal}
        server={selectedServer}
        onSave={handleSave}
      />

      {isDiagnosticOpen && selectedServer && (
        <SmtpConnectionDiagnostic
          server={selectedServer}
          onClose={handleCloseDiagnostic}
        />
      )}

      {isTestEmailOpen && selectedServer && (
        <SmtpTestEmailModal
          open={isTestEmailOpen}
          server={selectedServer}
          onClose={handleCloseTestEmail}
        />
      )}
    </div>
  );
}
