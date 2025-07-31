import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSmtpServers, SmtpServer } from '@/hooks/useSmtpServers';
import { useSendingDomains, CreateDomainData } from '@/hooks/useSendingDomains';
import { useToast } from '@/hooks/use-toast';
import { Edit, Trash2, Plus, TestTube, Mail, Link2 } from 'lucide-react';
import SmtpConfigurationModal from './SmtpConfigurationModal';
import SmtpConnectionDiagnostic from './SmtpConnectionDiagnostic';
import SmtpTestEmailModal from './SmtpTestEmailModal';
import { CreateDomainModal } from './CreateDomainModal';

export default function SendingDomainsPage() {
  const { domains, isLoading, createDomain, verifyDomain, deleteDomain, isCreating, isVerifying, isDeleting } = useSendingDomains();
  const { servers, loading, updateServer } = useSmtpServers();
  const { toast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);

  const handleCreateDomain = async (domainData: CreateDomainData, smtpServerId?: string) => {
    try {
      await createDomain(domainData, smtpServerId);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Error creating domain:', error);
    }
  };

  const handleVerify = async (domainId: string) => {
    try {
      await verifyDomain(domainId);
    } catch (error) {
      console.error('Error verifying domain:', error);
    }
  };

  const handleDelete = async (domainId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce domaine ?')) {
      try {
        await deleteDomain(domainId);
      } catch (error) {
        console.error('Error deleting domain:', error);
      }
    }
  };

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">🌐 Domaines d'envoi</h1>
          <p className="text-gray-600">
            Authentifiez vos domaines pour améliorer la délivrabilité de vos emails
          </p>
        </div>
        <Button onClick={handleOpenCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un domaine
        </Button>
      </div>

      <div className="grid gap-6">
        {domains.map((domain) => (
          <Card key={domain.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {domain.domain}
                  <Badge variant={domain.status === 'verified' ? 'default' : 'secondary'}>
                    {domain.status === 'verified' ? 'Vérifié' : 'Non vérifié'}
                  </Badge>
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleVerify(domain.id)}
                    disabled={isVerifying}
                  >
                    {isVerifying ? 'Vérification...' : 'Vérifier DNS'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(domain.id)}
                    disabled={isDeleting}
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
                  <p className="text-sm text-gray-600">DKIM</p>
                  <Badge variant={domain.dkim_status === 'verified' ? 'default' : 'secondary'}>
                    {domain.dkim_status === 'verified' ? 'Vérifié' : 'Non vérifié'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">SPF</p>
                  <Badge variant={domain.spf_status === 'verified' ? 'default' : 'secondary'}>
                    {domain.spf_status === 'verified' ? 'Vérifié' : 'Non vérifié'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">DMARC</p>
                  <Badge variant={domain.dmarc_status === 'verified' ? 'default' : 'secondary'}>
                    {domain.dmarc_status === 'verified' ? 'Vérifié' : 'Non vérifié'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vérification</p>
                  <Badge variant={domain.verification_status === 'verified' ? 'default' : 'secondary'}>
                    {domain.verification_status === 'verified' ? 'Vérifié' : 'Non vérifié'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {domains.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-lg text-gray-500">Aucun domaine d'envoi configuré</p>
            <p className="text-sm text-gray-400 mb-4">
              Créez votre premier domaine pour commencer à envoyer des emails
            </p>
            <Button onClick={handleOpenCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Créer un domaine
            </Button>
          </CardContent>
        </Card>
      )}

      <CreateDomainModal
        open={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onSubmit={handleCreateDomain}
      />
    </div>
  );
}
