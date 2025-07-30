import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Plus, FileText, CheckCircle, XCircle, Clock, Trash2, RefreshCw } from 'lucide-react';
import { useSendingDomains, CreateDomainData, CreateDomainResponse } from '@/hooks/useSendingDomains';
import { CreateDomainModal } from './CreateDomainModal';
import { DnsInstructions } from './DnsInstructions';
import { DomainSmtpStatus } from './DomainSmtpStatus';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

export default function SendingDomainsPage() {
  const { domains, loading, verifyingDomains, createDomain, verifyDomain, deleteDomain } = useSendingDomains();
  const { user } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDnsModalOpen, setIsDnsModalOpen] = useState(false);
  const [selectedDnsRecords, setSelectedDnsRecords] = useState<any>(null);
  const [selectedDomainName, setSelectedDomainName] = useState('');
  const [userTenantId, setUserTenantId] = useState<string>('');

  useEffect(() => {
    console.log('User role:', user?.role);
    
    // Pour les super admins, pas besoin de tenant_id
    if (user?.role === 'super_admin') {
      console.log('Super admin detected, not setting tenant_id');
      setUserTenantId('');
      return;
    }

    // Pour les autres utilisateurs, récupérer le tenant_id
    const fetchUserTenant = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: userProfile } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('id', authUser.id)
          .single();
        
        if (userProfile?.tenant_id) {
          setUserTenantId(userProfile.tenant_id);
        }
      }
    };
    
    fetchUserTenant();
  }, [user]);

  const handleDomainCreated = (domainData: CreateDomainData, response: CreateDomainResponse) => {
    setSelectedDomainName(domainData.domain_name);
    setSelectedDnsRecords(response.dns_records);
    setIsDnsModalOpen(true);
  };

  const handleShowDnsInstructions = (domain: any) => {
    const dnsRecords = {
      dkim: {
        host: `${domain.dkim_selector}._domainkey.${domain.domain_name}`,
        value: `v=DKIM1; k=rsa; p=${domain.dkim_public_key}`
      },
      spf: {
        host: domain.domain_name,
        value: domain.spf_record
      },
      dmarc: {
        host: `_dmarc.${domain.domain_name}`,
        value: domain.dmarc_record
      },
      verification: {
        host: `_lovable-verify.${domain.domain_name}`,
        value: domain.verification_token
      }
    };

    setSelectedDomainName(domain.domain_name);
    setSelectedDnsRecords(dnsRecords);
    setIsDnsModalOpen(true);
  };

  const handleDelete = async (domainId: string, domainName: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le domaine "${domainName}" ?`)) {
      await deleteDomain(domainId);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />🟢 Vérifié</Badge>;
      case 'verifying':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1 animate-spin" />🔵 Vérification</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />🔴 Échec</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />🟡 En attente</Badge>;
    }
  };

  const getDkimStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-600">✅ Vérifié</Badge>;
      case 'failed':
        return <Badge variant="destructive">❌ Échec</Badge>;
      default:
        return <Badge variant="secondary">⏳ En attente</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Chargement des domaines d'envoi...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📧 Domaines d'envoi</h1>
          <p className="text-gray-600">Gérez vos domaines avec authentification DKIM/SPF/DMARC</p>
        </div>
        
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un domaine
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total domaines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{domains.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">🟢 Vérifiés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {domains.filter(d => d.status === 'verified').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">🟡 En attente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {domains.filter(d => d.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">🔴 Échecs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {domains.filter(d => d.status === 'failed').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table des domaines */}
      <Card>
        <CardHeader>
          <CardTitle>Domaines configurés</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domaine</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>DKIM</TableHead>
                <TableHead>Serveur SMTP</TableHead>
                <TableHead>Sélecteur</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {domains.map((domain) => (
                <TableRow key={domain.id}>
                  <TableCell className="font-medium">{domain.domain_name}</TableCell>
                  <TableCell>{getStatusBadge(domain.status)}</TableCell>
                  <TableCell>{getDkimStatusBadge(domain.dkim_status)}</TableCell>
                  <TableCell>
                    <DomainSmtpStatus 
                      domainId={domain.id} 
                      domainName={domain.domain_name} 
                    />
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                      {domain.dkim_selector}
                    </code>
                  </TableCell>
                  <TableCell>
                    {new Date(domain.created_at).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShowDnsInstructions(domain)}
                        title="Voir les instructions DNS"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => verifyDomain(domain.id)}
                        disabled={verifyingDomains.has(domain.id)}
                        title="Vérifier le domaine"
                      >
                        <RefreshCw className={`h-4 w-4 ${verifyingDomains.has(domain.id) ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(domain.id, domain.domain_name)}
                        title="Supprimer le domaine"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {domains.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg">Aucun domaine d'envoi configuré</p>
              <p className="text-sm">Créez d'abord un serveur SMTP, puis ajoutez votre domaine</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateDomainModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onDomainCreated={handleDomainCreated}
        onCreateDomain={createDomain}
        tenantId={userTenantId}
        isSuperAdmin={user?.role === 'super_admin'}
      />

      {selectedDnsRecords && (
        <DnsInstructions
          open={isDnsModalOpen}
          onClose={() => setIsDnsModalOpen(false)}
          domainName={selectedDomainName}
          dnsRecords={selectedDnsRecords}
        />
      )}
    </div>
  );
}
