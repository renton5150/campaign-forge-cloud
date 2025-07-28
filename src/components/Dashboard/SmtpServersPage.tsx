
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSmtpServers, SmtpServer } from '@/hooks/useSmtpServers';
import { useToast } from '@/hooks/use-toast';
import { Edit, Trash2, Plus, TestTube } from 'lucide-react';
import SmtpConfigurationModal from './SmtpConfigurationModal';
import SmtpConnectionDiagnostic from './SmtpConnectionDiagnostic';

export default function SmtpServersPage() {
  const { servers, loading, createServer, updateServer, deleteServer, testSmtpConnection } = useSmtpServers();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<SmtpServer | undefined>();
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);

  const handleEdit = (server: SmtpServer) => {
    console.log('Edit button clicked for server:', server);
    setSelectedServer(server);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    console.log('Create button clicked');
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

  const handleCloseModal = () => {
    console.log('Modal close requested');
    setIsModalOpen(false);
    setSelectedServer(undefined);
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Serveurs SMTP</h1>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un serveur
        </Button>
      </div>

      <div className="grid gap-6">
        {servers.map((server) => (
          <Card key={server.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {server.name}
                  <Badge variant={server.is_active ? "default" : "secondary"}>
                    {server.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTest(server)}
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    Tester
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
            </CardContent>
          </Card>
        ))}
      </div>

      <SmtpConfigurationModal
        open={isModalOpen}
        onClose={handleCloseModal}
        server={selectedServer}
        onSave={handleSave}
      />

      <SmtpConnectionDiagnostic
        open={isDiagnosticOpen}
        onClose={() => setIsDiagnosticOpen(false)}
        server={selectedServer}
        onTest={testSmtpConnection}
      />
    </div>
  );
}
