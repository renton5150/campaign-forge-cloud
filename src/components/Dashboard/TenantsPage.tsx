
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tenant, TenantStatus } from '@/types/database';
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
import { Plus, Pencil, Trash2 } from 'lucide-react';

const TenantsPage = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState({
    company_name: '',
    domain: '',
    status: 'active' as TenantStatus
  });
  const { toast } = useToast();

  const fetchTenants = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTenants(data || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les tenants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingTenant) {
        // Update
        const { error } = await supabase
          .from('tenants')
          .update(formData)
          .eq('id', editingTenant.id);
        
        if (error) throw error;
        
        toast({
          title: "Succès",
          description: "Tenant mis à jour avec succès",
        });
      } else {
        // Create
        const { error } = await supabase
          .from('tenants')
          .insert([formData]);
        
        if (error) throw error;
        
        toast({
          title: "Succès",
          description: "Tenant créé avec succès",
        });
      }
      
      setDialogOpen(false);
      setEditingTenant(null);
      setFormData({ company_name: '', domain: '', status: 'active' });
      fetchTenants();
    } catch (error: any) {
      console.error('Error saving tenant:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la sauvegarde",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      company_name: tenant.company_name,
      domain: tenant.domain,
      status: tenant.status
    });
    setDialogOpen(true);
  };

  const handleDelete = async (tenantId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce tenant ?')) return;
    
    try {
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', tenantId);
      
      if (error) throw error;
      
      toast({
        title: "Succès",
        description: "Tenant supprimé avec succès",
      });
      
      fetchTenants();
    } catch (error: any) {
      console.error('Error deleting tenant:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la suppression",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: TenantStatus) => {
    const variants = {
      active: 'default',
      inactive: 'secondary',
      suspended: 'destructive'
    } as const;
    
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  if (loading) {
    return <div className="p-6">Chargement...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Tenants</h1>
          <p className="text-gray-600">Gérez vos clients et leurs accès</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingTenant(null);
              setFormData({ company_name: '', domain: '', status: 'active' });
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau Tenant
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTenant ? 'Modifier le tenant' : 'Créer un nouveau tenant'}
              </DialogTitle>
              <DialogDescription>
                Remplissez les informations du tenant
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="company_name">Nom de l'entreprise</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData(prev => ({...prev, company_name: e.target.value}))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="domain">Domaine</Label>
                <Input
                  id="domain"
                  value={formData.domain}
                  onChange={(e) => setFormData(prev => ({...prev, domain: e.target.value}))}
                  placeholder="exemple.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="status">Statut</Label>
                <Select value={formData.status} onValueChange={(value: TenantStatus) => 
                  setFormData(prev => ({...prev, status: value}))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="inactive">Inactif</SelectItem>
                    <SelectItem value="suspended">Suspendu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">
                  {editingTenant ? 'Mettre à jour' : 'Créer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entreprise</TableHead>
              <TableHead>Domaine</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell className="font-medium">{tenant.company_name}</TableCell>
                <TableCell>{tenant.domain}</TableCell>
                <TableCell>{getStatusBadge(tenant.status)}</TableCell>
                <TableCell>
                  {new Date(tenant.created_at).toLocaleDateString('fr-FR')}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(tenant)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(tenant.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {tenants.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Aucun tenant trouvé
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantsPage;
