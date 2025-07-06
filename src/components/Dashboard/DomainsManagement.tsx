import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Domain, Tenant, DomainVerificationStatus } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, RefreshCw, CheckCircle, Clock, XCircle, FileText } from 'lucide-react';
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { z } from 'zod';
import { generateDKIMKeyPair } from '@/lib/dns-generator';
import { DNSInstructionsModal } from '@/components/Dashboard/DNSInstructionsModal';

const domainSchema = z.object({
  domain_name: z.string()
    .min(1, 'Le nom de domaine est requis')
    .regex(/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i, 'Format de domaine invalide'),
  tenant_id: z.string().min(1, 'Le tenant est requis'),
});

type DomainFormData = z.infer<typeof domainSchema>;

interface DomainWithTenant extends Domain {
  tenant?: Tenant;
}

const DomainsManagement = () => {
  const [domains, setDomains] = useState<DomainWithTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null);
  const [formData, setFormData] = useState<DomainFormData>({
    domain_name: '',
    tenant_id: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<DomainVerificationStatus | 'all'>('all');
  const [tenantFilter, setTenantFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [verifyingDomains, setVerifyingDomains] = useState<Set<string>>(new Set());
  const [dnsModalOpen, setDnsModalOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const itemsPerPage = 10;

  // Fetch tenants for dropdown
  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('company_name');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch domains with tenant information
  const { data: domainsData, refetch: refetchDomains } = useQuery({
    queryKey: ['domains'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('domains')
        .select(`
          *,
          tenant:tenants(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const domainsWithTenant = data?.map(domain => ({
        ...domain,
        tenant: Array.isArray(domain.tenant) ? domain.tenant[0] : domain.tenant
      })) || [];
      
      setDomains(domainsWithTenant);
      setLoading(false);
      return domainsWithTenant;
    },
  });

  // Create domain mutation with automatic DKIM generation
  const createDomainMutation = useMutation({
    mutationFn: async (data: DomainFormData) => {
      try {
        // Generate DKIM keys automatically
        const dkimKeys = generateDKIMKeyPair();
        
        const { error } = await supabase
          .from('domains')
          .insert([{
            domain_name: data.domain_name,
            tenant_id: data.tenant_id,
            verified: false,
            dkim_status: 'pending' as DomainVerificationStatus,
            dkim_private_key: dkimKeys.privateKey,
            dkim_public_key: dkimKeys.publicKey,
            dkim_selector: dkimKeys.selector
          }]);
        
        if (error) throw error;
        return { success: true };
      } catch (error) {
        console.error('Error creating domain:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "✅ Domaine créé avec succès",
        description: "Les clés DKIM ont été générées automatiquement",
      });
      setDialogOpen(false);
      resetForm();
      refetchDomains();
    },
    onError: (error: any) => {
      console.error('Error creating domain:', error);
      toast({
        title: "❌ Erreur",
        description: error.message || "Erreur lors de la création du domaine",
        variant: "destructive",
      });
    },
  });

  // Update domain mutation
  const updateDomainMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: DomainFormData }) => {
      const { error } = await supabase
        .from('domains')
        .update({
          domain_name: data.domain_name,
          tenant_id: data.tenant_id
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "✅ Succès",
        description: "Domaine mis à jour avec succès",
      });
      setDialogOpen(false);
      resetForm();
      refetchDomains();
    },
    onError: (error: any) => {
      console.error('Error updating domain:', error);
      toast({
        title: "❌ Erreur",
        description: error.message || "Erreur lors de la mise à jour",
        variant: "destructive",
      });
    },
  });

  // Delete domain mutation
  const deleteDomainMutation = useMutation({
    mutationFn: async (domainId: string) => {
      const { error } = await supabase
        .from('domains')
        .delete()
        .eq('id', domainId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "✅ Succès",
        description: "Domaine supprimé avec succès",
      });
      refetchDomains();
    },
    onError: (error: any) => {
      console.error('Error deleting domain:', error);
      toast({
        title: "❌ Erreur",
        description: error.message || "Erreur lors de la suppression",
        variant: "destructive",
      });
    },
  });

  // Verify domain mutation (simulated DNS verification)
  const verifyDomainMutation = useMutation({
    mutationFn: async (domainId: string) => {
      setVerifyingDomains(prev => new Set(prev).add(domainId));
      
      // Simulate DNS verification delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Randomly assign verification status for demo (80% success rate)
      const isVerified = Math.random() > 0.2;
      const newStatus: DomainVerificationStatus = isVerified ? 'verified' : 'failed';
      
      const { error } = await supabase
        .from('domains')
        .update({
          verified: isVerified,
          dkim_status: newStatus
        })
        .eq('id', domainId);
      
      if (error) throw error;
      
      setVerifyingDomains(prev => {
        const newSet = new Set(prev);
        newSet.delete(domainId);
        return newSet;
      });
      
      return { isVerified, status: newStatus };
    },
    onSuccess: (result) => {
      toast({
        title: result.isVerified ? "✅ Domaine vérifié" : "❌ Vérification échouée",
        description: result.isVerified 
          ? "Le domaine a été vérifié avec succès" 
          : "La vérification DNS a échoué. Vérifiez vos enregistrements DNS.",
        variant: result.isVerified ? "default" : "destructive",
      });
      refetchDomains();
    },
    onError: (error: any) => {
      console.error('Error verifying domain:', error);
      toast({
        title: "❌ Erreur",
        description: "Erreur lors de la vérification",
        variant: "destructive",
      });
    },
  });

  const validateForm = (data: DomainFormData): boolean => {
    try {
      domainSchema.parse(data);
      setFormErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path) {
            errors[err.path[0]] = err.message;
          }
        });
        setFormErrors(errors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm(formData)) {
      return;
    }
    
    if (editingDomain) {
      updateDomainMutation.mutate({ id: editingDomain.id, data: formData });
    } else {
      createDomainMutation.mutate(formData);
    }
  };

  const handleEdit = (domain: Domain) => {
    setEditingDomain(domain);
    setFormData({
      domain_name: domain.domain_name,
      tenant_id: domain.tenant_id
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleDelete = async (domainId: string) => {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer ce domaine ? Cette action est irréversible.')) return;
    deleteDomainMutation.mutate(domainId);
  };

  const handleVerify = (domainId: string) => {
    verifyDomainMutation.mutate(domainId);
  };

  const showDNSInstructions = (domain: Domain) => {
    setSelectedDomain(domain);
    setDnsModalOpen(true);
  };

  const resetForm = () => {
    setEditingDomain(null);
    setFormData({ domain_name: '', tenant_id: '' });
    setFormErrors({});
  };

  const getStatusBadge = (domain: Domain) => {
    if (verifyingDomains.has(domain.id)) {
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1 animate-spin" />Vérification...</Badge>;
    }
    
    if (domain.verified) {
      return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Vérifié</Badge>;
    }
    
    switch (domain.dkim_status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Échec</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
    }
  };

  // Filter and search logic
  const filteredDomains = domains.filter(domain => {
    const matchesSearch = domain.domain_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || domain.dkim_status === statusFilter;
    const matchesTenant = tenantFilter === 'all' || domain.tenant_id === tenantFilter;
    
    return matchesSearch && matchesStatus && matchesTenant;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredDomains.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDomains = filteredDomains.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Chargement des domaines...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🌐 Gestion des Domaines</h1>
          <p className="text-gray-600">Gérez les domaines et leurs configurations DKIM/SPF/DMARC</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau Domaine
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingDomain ? '✏️ Modifier le domaine' : '➕ Créer un nouveau domaine'}
              </DialogTitle>
              <DialogDescription>
                {editingDomain 
                  ? 'Modifiez les informations du domaine' 
                  : 'Les clés DKIM seront générées automatiquement lors de la création'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="domain_name">Nom de domaine</Label>
                <Input
                  id="domain_name"
                  value={formData.domain_name}
                  onChange={(e) => setFormData(prev => ({...prev, domain_name: e.target.value}))}
                  placeholder="exemple.com"
                  required
                />
                {formErrors.domain_name && (
                  <p className="text-sm text-red-600 mt-1">❌ {formErrors.domain_name}</p>
                )}
              </div>
              <div>
                <Label htmlFor="tenant_id">Tenant propriétaire</Label>
                <Select value={formData.tenant_id} onValueChange={(value) => 
                  setFormData(prev => ({...prev, tenant_id: value}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.tenant_id && (
                  <p className="text-sm text-red-600 mt-1">❌ {formErrors.tenant_id}</p>
                )}
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={createDomainMutation.isPending || updateDomainMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {createDomainMutation.isPending || updateDomainMutation.isPending ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      {editingDomain ? 'Mise à jour...' : 'Création...'}
                    </>
                  ) : (
                    editingDomain ? 'Mettre à jour' : 'Créer'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="search">🔍 Recherche</Label>
          <Input
            id="search"
            placeholder="Rechercher par domaine..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div>
          <Label htmlFor="status-filter">📊 Statut</Label>
          <Select value={statusFilter} onValueChange={(value: DomainVerificationStatus | 'all') => {
            setStatusFilter(value);
            setCurrentPage(1);
          }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">⏳ En attente</SelectItem>
              <SelectItem value="verified">✅ Vérifié</SelectItem>
              <SelectItem value="failed">❌ Échec</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="tenant-filter">🏢 Tenant</Label>
          <Select value={tenantFilter} onValueChange={(value) => {
            setTenantFilter(value);
            setCurrentPage(1);
          }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les tenants</SelectItem>
              {tenants.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  {tenant.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button 
            variant="outline" 
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setTenantFilter('all');
              setCurrentPage(1);
            }}
          >
            🔄 Réinitialiser
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>🌐 Domaine</TableHead>
              <TableHead>🏢 Tenant</TableHead>
              <TableHead>📊 Statut</TableHead>
              <TableHead>📅 Créé le</TableHead>
              <TableHead>⚙️ Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedDomains.map((domain) => (
              <TableRow key={domain.id}>
                <TableCell className="font-medium">{domain.domain_name}</TableCell>
                <TableCell>
                  {domain.tenant?.company_name || 'N/A'}
                </TableCell>
                <TableCell>{getStatusBadge(domain)}</TableCell>
                <TableCell>
                  {new Date(domain.created_at).toLocaleDateString('fr-FR')}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => showDNSInstructions(domain)}
                      title="Voir les instructions DNS"
                      className="hover:bg-blue-50"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerify(domain.id)}
                      disabled={verifyingDomains.has(domain.id)}
                      title="Vérifier le domaine"
                      className="hover:bg-green-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${verifyingDomains.has(domain.id) ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(domain)}
                      title="Modifier le domaine"
                      className="hover:bg-yellow-50"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(domain.id)}
                      disabled={deleteDomainMutation.isPending}
                      title="Supprimer le domaine"
                      className="hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {paginatedDomains.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {filteredDomains.length === 0 ? (
              <div>
                <p className="text-lg">🚫 Aucun domaine trouvé</p>
                <p className="text-sm">Créez votre premier domaine pour commencer</p>
              </div>
            ) : (
              <p>🔍 Aucun résultat pour ces filtres</p>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                {[...Array(totalPages)].map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      onClick={() => setCurrentPage(i + 1)}
                      isActive={currentPage === i + 1}
                      className="cursor-pointer"
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">📈 Total Domaines</h3>
          <p className="text-2xl font-bold text-gray-900">{domains.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">✅ Vérifiés</h3>
          <p className="text-2xl font-bold text-green-600">
            {domains.filter(d => d.verified).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">⏳ En attente</h3>
          <p className="text-2xl font-bold text-yellow-600">
            {domains.filter(d => d.dkim_status === 'pending').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">❌ Échecs</h3>
          <p className="text-2xl font-bold text-red-600">
            {domains.filter(d => d.dkim_status === 'failed').length}
          </p>
        </div>
      </div>

      {/* DNS Instructions Modal */}
      {selectedDomain && (
        <DNSInstructionsModal
          domain={selectedDomain}
          open={dnsModalOpen}
          onClose={() => setDnsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default DomainsManagement;