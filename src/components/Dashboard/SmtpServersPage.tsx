
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, TestTube, Trash2, Loader2 } from 'lucide-react';
import { useSmtpServers, SmtpServer } from '@/hooks/useSmtpServers';
import SmtpConfigurationModal from './SmtpConfigurationModal';
import SmtpTestEmailModal from './SmtpTestEmailModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const SmtpServersPage = () => {
  const { servers, loading, deleteServer, updateServer, refetch } = useSmtpServers();
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<SmtpServer | null>(null);
  const [serverToDelete, setServerToDelete] = useState<SmtpServer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = (server: SmtpServer) => {
    setSelectedServer(server);
    setIsConfigModalOpen(true);
  };

  const handleTest = (server: SmtpServer) => {
    setSelectedServer(server);
    setIsTestModalOpen(true);
  };

  const handleDelete = async () => {
    if (!serverToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteServer(serverToDelete.id);
      setServerToDelete(null);
    } catch (error) {
      console.error('Error deleting server:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getServerTypeLabel = (type: string) => {
    switch (type) {
      case 'smtp': return 'SMTP';
      case 'sendgrid': return 'SendGrid';
      case 'mailgun': return 'Mailgun';
      case 'amazon_ses': return 'Amazon SES';
      default: return type;
    }
  };

  const getServerStatusBadge = (isActive: boolean) => (
    <Badge variant={isActive ? 'default' : 'secondary'}>
      {isActive ? 'Actif' : 'Inactif'}
    </Badge>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Serveurs SMTP</h1>
          <p className="text-muted-foreground">
            Gérez vos serveurs d'envoi d'emails
          </p>
        </div>
        <Button onClick={() => setIsConfigModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un serveur
        </Button>
      </div>

      {servers.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun serveur configuré</h3>
              <p className="text-muted-foreground mb-4">
                Configurez votre premier serveur SMTP pour commencer à envoyer des emails.
              </p>
              <Button onClick={() => setIsConfigModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Configurer un serveur
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {servers.map((server) => (
            <Card key={server.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {server.name}
                      {getServerStatusBadge(server.is_active)}
                    </CardTitle>
                    <CardDescription>
                      {getServerTypeLabel(server.type)} • {server.from_email}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTest(server)}
                    >
                      <TestTube className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(server)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setServerToDelete(server)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Type:</span>
                    <p className="text-muted-foreground">{getServerTypeLabel(server.type)}</p>
                  </div>
                  <div>
                    <span className="font-medium">Nom d'expéditeur:</span>
                    <p className="text-muted-foreground">{server.from_name}</p>
                  </div>
                  <div>
                    <span className="font-medium">Email d'expéditeur:</span>
                    <p className="text-muted-foreground">{server.from_email}</p>
                  </div>
                  <div>
                    <span className="font-medium">Statut:</span>
                    <p className="text-muted-foreground">
                      {server.is_active ? 'Actif' : 'Inactif'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SmtpConfigurationModal
        open={isConfigModalOpen}
        onClose={() => {
          setIsConfigModalOpen(false);
          setSelectedServer(null);
        }}
        server={selectedServer}
        onSave={async (data) => {
          if (selectedServer) {
            await updateServer(selectedServer.id, data);
          }
          setIsConfigModalOpen(false);
          setSelectedServer(null);
          refetch();
        }}
      />

      <SmtpTestEmailModal
        open={isTestModalOpen}
        onClose={() => {
          setIsTestModalOpen(false);
          setSelectedServer(null);
        }}
        server={selectedServer}
      />

      <AlertDialog open={!!serverToDelete} onOpenChange={() => setServerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le serveur</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le serveur "{serverToDelete?.name}" ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SmtpServersPage;
