
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, RefreshCw, Settings, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useSendingDomains } from '@/hooks/useSendingDomains';
import { CreateDomainModal } from './CreateDomainModal';
import { DNSInstructionsModal } from './DNSInstructionsModal';
import { DNSStatusBadges } from './DNSStatusBadges';

export const SendingDomainsPage = () => {
  const { domains, isLoading, createDomain, deleteDomain, verifyDomain, isCreating, isDeleting, isVerifying } = useSendingDomains();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDnsModalOpen, setIsDnsModalOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<any>(null);

  const handleCreateDomain = (domain: string) => {
    createDomain(domain);
    setIsCreateModalOpen(false);
  };

  const handleViewDnsInstructions = (domain: any) => {
    setSelectedDomain(domain);
    setIsDnsModalOpen(true);
  };

  const getGlobalStatusBadge = (domain: any) => {
    const variant = domain.status === 'verified' ? 'default' : 
                   domain.status === 'failed' ? 'destructive' : 'secondary';
    
    const icon = domain.status === 'verified' ? <CheckCircle className="w-3 h-3" /> :
                 domain.status === 'failed' ? <XCircle className="w-3 h-3" /> :
                 <Clock className="w-3 h-3" />;
    
    const label = domain.status === 'verified' ? 'Vérifié' :
                  domain.status === 'failed' ? 'Échec' : 'En attente';

    return (
      <Badge variant={variant} className="text-xs px-2 py-1">
        {icon}
        <span className="ml-1">{label}</span>
      </Badge>
    );
  };

  // Calculate statistics
  const totalDomains = domains.length;
  const verifiedDomains = domains.filter(d => d.status === 'verified').length;
  const failedDomains = domains.filter(d => d.status === 'failed').length;
  const pendingDomains = domains.filter(d => d.status === 'pending').length;

  // DNS-specific statistics
  const dkimIssues = domains.filter(d => d.status === 'failed').length;
  const spfIssues = domains.filter(d => d.spf_status === 'failed').length;
  const dmarcIssues = domains.filter(d => d.dmarc_status === 'failed').length;
  const verificationIssues = domains.filter(d => d.verification_status === 'failed').length;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Domaines d'envoi</h1>
          <p className="text-muted-foreground">Gérez vos domaines d'envoi et leur configuration DNS</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} disabled={isCreating}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un domaine
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Domaines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDomains}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vérifiés</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{verifiedDomains}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En échec</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedDomains}</div>
            <div className="text-xs text-muted-foreground mt-1">
              SPF: {spfIssues} | DMARC: {dmarcIssues} | Vérif: {verificationIssues}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingDomains}</div>
          </CardContent>
        </Card>
      </div>

      {/* Domains Table */}
      <Card>
        <CardHeader>
          <CardTitle>Domaines configurés</CardTitle>
          <CardDescription>
            Liste de vos domaines d'envoi avec leur statut de validation DNS détaillé
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domaine</TableHead>
                <TableHead>Statut Global</TableHead>
                <TableHead>Statut DNS Détaillé</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {domains.map((domain) => (
                <TableRow key={domain.id}>
                  <TableCell className="font-medium">{domain.domain}</TableCell>
                  <TableCell>
                    {getGlobalStatusBadge(domain)}
                  </TableCell>
                  <TableCell>
                    <DNSStatusBadges
                      dkimStatus={domain.status || 'pending'}
                      spfStatus={domain.spf_status || 'pending'}
                      dmarcStatus={domain.dmarc_status || 'pending'}
                      verificationStatus={domain.verification_status || 'pending'}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(domain.created_at).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => verifyDomain(domain.id)}
                        disabled={isVerifying}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Vérifier
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDnsInstructions(domain)}
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        DNS
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteDomain(domain.id)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {domains.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Aucun domaine configuré. Cliquez sur "Ajouter un domaine" pour commencer.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateDomainModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onCreateDomain={handleCreateDomain}
      />

      {selectedDomain && (
        <DNSInstructionsModal
          open={isDnsModalOpen}
          onOpenChange={setIsDnsModalOpen}
          domain={selectedDomain}
        />
      )}
    </div>
  );
};
