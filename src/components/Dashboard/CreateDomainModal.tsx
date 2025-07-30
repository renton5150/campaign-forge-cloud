
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { CreateDomainData, CreateDomainResponse } from '@/hooks/useSendingDomains';
import { useSmtpServers } from '@/hooks/useSmtpServers';

interface CreateDomainModalProps {
  open: boolean;
  onClose: () => void;
  onDomainCreated: (domainData: CreateDomainData, response: CreateDomainResponse) => void;
  onCreateDomain: (domainData: CreateDomainData & { smtp_server_id?: string }) => Promise<CreateDomainResponse | null>;
  tenantId: string;
  isSuperAdmin?: boolean;
}

export function CreateDomainModal({ 
  open, 
  onClose, 
  onDomainCreated, 
  onCreateDomain, 
  tenantId,
  isSuperAdmin = false
}: CreateDomainModalProps) {
  const [domainName, setDomainName] = useState('');
  const [selectedSmtpServerId, setSelectedSmtpServerId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { servers: smtpServers, loading: smtpLoading } = useSmtpServers();

  // Filtrer les serveurs SMTP actifs
  const activeSmtpServers = smtpServers.filter(server => server.is_active);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== DÉBUT CRÉATION DOMAINE ===');
    console.log('Domain name:', domainName);
    console.log('Selected SMTP server:', selectedSmtpServerId);
    console.log('Is super admin:', isSuperAdmin);
    console.log('Tenant ID:', tenantId);
    console.log('Active SMTP servers:', activeSmtpServers.length);
    
    if (!domainName.trim()) {
      console.log('❌ Erreur: nom de domaine vide');
      toast({
        title: "Erreur",
        description: "Veuillez saisir un nom de domaine.",
        variant: "destructive",
      });
      return;
    }

    // Pour les super admins, le serveur SMTP n'est pas obligatoire
    if (!isSuperAdmin && !selectedSmtpServerId) {
      console.log('❌ Erreur: serveur SMTP requis pour utilisateur non-admin');
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un serveur SMTP.",
        variant: "destructive",
      });
      return;
    }

    // Validation basique du format de domaine
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!domainRegex.test(domainName.trim())) {
      console.log('❌ Erreur: format de domaine invalide');
      toast({
        title: "Erreur",
        description: "Format de domaine invalide. Exemple: mail.monsite.com",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    console.log('⏳ Début du processus de création...');

    try {
      console.log('📤 Envoi de la requête de création domaine...');
      
      const domainData: CreateDomainData & { smtp_server_id?: string } = {
        domain_name: domainName.trim(),
        tenant_id: isSuperAdmin ? undefined : tenantId,
        smtp_server_id: selectedSmtpServerId || undefined
      };

      console.log('📋 Données envoyées:', domainData);

      const response = await onCreateDomain(domainData);
      
      console.log('📥 Réponse reçue:', response);
      
      if (response && response.success) {
        console.log('✅ Domaine créé avec succès');
        onDomainCreated(domainData, response);
        setDomainName('');
        setSelectedSmtpServerId('');
        onClose();
        
        toast({
          title: "Succès",
          description: "Le domaine d'envoi a été créé avec succès.",
        });
      } else {
        console.log('❌ Échec de création:', response);
        toast({
          title: "Erreur",
          description: response ? "Erreur lors de la création du domaine." : "Réponse invalide du serveur.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('💥 Erreur lors de la création:', error);
      toast({
        title: "Erreur",
        description: `Impossible de créer le domaine: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      console.log('=== FIN CRÉATION DOMAINE ===');
    }
  };

  const handleClose = () => {
    setDomainName('');
    setSelectedSmtpServerId('');
    onClose();
  };

  const selectedServer = activeSmtpServers.find(server => server.id === selectedSmtpServerId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Ajouter un domaine d'envoi
            {isSuperAdmin && (
              <span className="ml-2 text-sm font-normal text-blue-600">(Super Admin)</span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSuperAdmin && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                🔧 <strong>Mode Super Administrateur</strong> - Ce domaine sera créé au niveau système.
                Le serveur SMTP est optionnel et peut être configuré ultérieurement.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="domain">Nom de domaine</Label>
            <Input
              id="domain"
              value={domainName}
              onChange={(e) => setDomainName(e.target.value)}
              placeholder="mail.monsite.com"
              required
              disabled={isLoading}
            />
            <p className="text-sm text-gray-600">
              Utilisez un sous-domaine dédié pour l'envoi d'emails (ex: mail.monsite.com)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtp-server">
              Serveur SMTP {!isSuperAdmin && <span className="text-red-500">*</span>}
            </Label>
            <Select value={selectedSmtpServerId} onValueChange={setSelectedSmtpServerId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un serveur SMTP (optionnel)" />
              </SelectTrigger>
              <SelectContent>
                {activeSmtpServers.map((server) => (
                  <SelectItem key={server.id} value={server.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{server.name}</span>
                      <span className="text-sm text-gray-500">
                        {server.type} - {server.from_email}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isSuperAdmin && activeSmtpServers.length === 0 && !smtpLoading && (
              <p className="text-sm text-red-600">
                Aucun serveur SMTP actif trouvé. Créez d'abord un serveur SMTP.
              </p>
            )}
            {isSuperAdmin && (
              <p className="text-sm text-gray-600">
                En tant que super admin, vous pouvez créer le domaine sans serveur SMTP et le configurer plus tard.
              </p>
            )}
          </div>

          {selectedServer && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="font-semibold text-blue-900 text-sm mb-1">Serveur SMTP sélectionné</h4>
              <p className="text-sm text-blue-800">
                <strong>{selectedServer.name}</strong> ({selectedServer.type})
              </p>
              <p className="text-sm text-blue-700">
                Email expéditeur : {selectedServer.from_email}
              </p>
            </div>
          )}

          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2">🔗 Configuration DNS</h4>
            <p className="text-sm text-green-800">
              Après création, vous recevrez les instructions DNS pour authentifier votre domaine 
              avec DKIM, SPF et DMARC.
              {selectedSmtpServerId && " Le domaine sera automatiquement lié au serveur SMTP sélectionné."}
            </p>
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || (!isSuperAdmin && activeSmtpServers.length === 0)}
            >
              {isLoading ? 'Création...' : 'Créer le domaine'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
