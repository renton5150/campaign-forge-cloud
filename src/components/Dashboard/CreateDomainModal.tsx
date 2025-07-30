
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { CreateDomainData } from '@/hooks/useSendingDomains';

interface CreateDomainModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (domainData: CreateDomainData) => Promise<void>;
}

export const CreateDomainModal = ({ open, onClose, onSubmit }: CreateDomainModalProps) => {
  const [domainName, setDomainName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!domainName.trim()) {
      return;
    }

    setIsLoading(true);
    
    try {
      await onSubmit({
        domain: domainName.trim()
      });
      
      setDomainName('');
      onClose();
    } catch (error) {
      console.error('Error creating domain:', error);
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

          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2">🔗 Configuration DNS</h4>
            <p className="text-sm text-green-800">
              Après création, vous recevrez les instructions DNS pour authentifier votre domaine 
              avec DKIM, SPF et DMARC.
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
              disabled={isLoading}
            >
              {isLoading ? 'Création...' : 'Créer le domaine'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
