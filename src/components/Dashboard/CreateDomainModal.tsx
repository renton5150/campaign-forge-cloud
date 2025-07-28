
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { CreateDomainData, CreateDomainResponse } from '@/hooks/useSendingDomains';

interface CreateDomainModalProps {
  open: boolean;
  onClose: () => void;
  onDomainCreated: (domainData: CreateDomainData, response: CreateDomainResponse) => void;
  onCreateDomain: (domainData: CreateDomainData) => Promise<CreateDomainResponse | null>;
  tenantId: string;
}

export function CreateDomainModal({ 
  open, 
  onClose, 
  onDomainCreated, 
  onCreateDomain, 
  tenantId 
}: CreateDomainModalProps) {
  const [domainName, setDomainName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!domainName.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un nom de domaine.",
        variant: "destructive",
      });
      return;
    }

    // Validation basique du format de domaine
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!domainRegex.test(domainName.trim())) {
      toast({
        title: "Erreur",
        description: "Format de domaine invalide. Exemple: mail.monsite.com",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const domainData: CreateDomainData = {
        domain_name: domainName.trim(),
        tenant_id: tenantId
      };

      const response = await onCreateDomain(domainData);
      
      if (response && response.success) {
        onDomainCreated(domainData, response);
        setDomainName('');
        onClose();
      }
    } catch (error) {
      console.error('Error creating domain:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le domaine.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setDomainName('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un domaine d'envoi</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">🔔 Après création</h4>
            <p className="text-sm text-blue-800">
              Vous recevrez les instructions DNS à configurer dans votre zone DNS 
              pour authentifier et vérifier votre domaine d'envoi.
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Création...' : 'Créer le domaine'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
