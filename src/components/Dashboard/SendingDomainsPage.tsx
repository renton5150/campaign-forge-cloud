
import { useState } from 'react';
import { useSendingDomains } from '@/hooks/useSendingDomains';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Shield, CheckCircle, XCircle, Clock, RefreshCw, Trash2 } from 'lucide-react';
import { CreateDomainModal } from './CreateDomainModal';
import { DeleteDomainModal } from './DeleteDomainModal';
import { DNSInstructionsModal } from './DNSInstructionsModal';
import { DNSStatusBadges } from './DNSStatusBadges';

interface SmtpConfig {
  provider: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  apiKey?: string;
  fromEmail: string;
  fromName: string;
}

const SendingDomainsPage = () => {
  const { domains, isLoading, createDomain, verifyDomain, deleteDomain, isCreating, isVerifying, isDeleting } = useSendingDomains();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDNSModal, setShowDNSModal] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<any>(null);
  const [domainToDelete, setDomainToDelete] = useState<any>(null);

  // Calculer les statistiques
  const totalDomains = domains.length;
  const verifiedDomains = domains.filter(d => d.status === 'verified').length;
  const pendingDomains = domains.filter(d => d.status === 'pending').length;
  const failedDomains = domains.filter(d => d.status === 'failed').length;

  const handleCreateDomain = async (domainData: any, smtpConfig?: SmtpConfig) => {
    try {
      if (smtpConfig) {
        console.log('Creating domain with SMTP config:', { domainData, smtpConfig });
        // TODO: Implement SMTP-aware domain creation
      }
      await createDomain(domainData);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating domain:', error);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    try {
      await verifyDomain(domainId);
    } catch (error) {
      console.error('Error verifying domain:', error);
    }
  };

  const handleDeleteDomain = async () => {
    if (!domainToDelete) return;
    
    try {
      await deleteDomain(domainToDelete.id);
      setShowDeleteModal(false);
      setDomainToDelete(null);
    } catch (error) {
      console.error('Error deleting domain:', error);
    }
  };

  const handleShowDNS = (domain: any) => {
    setSelectedDomain(domain);
    setShowDNSModal(true);
  };

  const handleShowDeleteModal = (domain: any) => {
    setDomainToDelete(domain);
    setShowDeleteModal(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Vérifié</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Échec</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Domaines d'envoi</h1>
          <p className="text-gray-600">Gérez vos domaines d'envoi et leur configuration DNS</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} disabled={isCreating}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un domaine
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDomains}</div>
            <p className="text-xs text-muted-foreground">domaines configurés</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vérifiés</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{verifiedDomains}</div>
            <p className="text-xs text-muted-foreground">DNS configuré</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingDomains}</div>
            <p className="text-xs text-muted-foreground">en cours de validation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Échecs</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedDomains}</div>
            <p className="text-xs text-muted-foreground">configuration incorrecte</p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des domaines */}
      <Card>
        <CardHeader>
          <CardTitle>Domaines configurés</CardTitle>
          <CardDescription>
            Liste de tous vos domaines d'envoi avec leur statut de validation DNS
          </CardDescription>
        </CardHeader>
        <CardContent>
          {domains.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun domaine</h3>
              <p className="mt-1 text-sm text-gray-500">Commencez par ajouter votre premier domaine d'envoi.</p>
              <div className="mt-6">
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un domaine
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domaine</TableHead>
                  <TableHead>Statut global</TableHead>
                  <TableHead>Validation DNS</TableHead>
                  <TableHead>Date de création</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell className="font-medium">{domain.domain}</TableCell>
                    <TableCell>
                      {getStatusBadge(domain.status)}
                    </TableCell>
                    <TableCell>
                      <DNSStatusBadges domain={domain} />
                    </TableCell>
                    <TableCell>
                      {new Date(domain.created_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShowDNS(domain)}
                          title="Instructions DNS"
                        >
                          DNS
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerifyDomain(domain.id)}
                          disabled={isVerifying}
                          title="Vérifier le domaine"
                        >
                          <RefreshCw className={`w-3 h-3 mr-1 ${isVerifying ? 'animate-spin' : ''}`} />
                          Vérifier
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShowDeleteModal(domain)}
                          disabled={isDeleting}
                          title="Supprimer le domaine"
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modales */}
      <CreateDomainModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateDomain}
      />

      {domainToDelete && (
        <DeleteDomainModal
          open={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setDomainToDelete(null);
          }}
          onConfirm={handleDeleteDomain}
          domainName={domainToDelete.domain}
          isDeleting={isDeleting}
        />
      )}

      <DNSInstructionsModal
        open={showDNSModal}
        onClose={() => setShowDNSModal(false)}
        domain={selectedDomain}
      />
    </div>
  );
};

export default SendingDomainsPage;
