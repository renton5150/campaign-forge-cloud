
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { CreateDomainData } from '@/hooks/useSendingDomains';
import { useSmtpServers } from '@/hooks/useSmtpServers';

interface CreateDomainModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (domainData: CreateDomainData, smtpServerId?: string) => Promise<void>;
}

export const CreateDomainModal = ({ open, onClose, onSubmit }: CreateDomainModalProps) => {
  const [domainName, setDomainName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachSmtpServer, setAttachSmtpServer] = useState(false);
  const [selectedSmtpServerId, setSelectedSmtpServerId] = useState<string>('');
  
  const { servers: smtpServers, loading: smtpLoading } = useSmtpServers();
  
  // Filtrer les serveurs SMTP actifs
  const activeSmtpServers = smtpServers.filter(server => server.is_active);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!domainName.trim()) {
      return;
    }

    const domainData: CreateDomainData = {
      domain: domainName.trim()
    };

    setIsLoading(true);
    try {
      await onSubmit(domainData, attachSmtpServer ? selectedSmtpServerId : undefined);
      setDomainName('');
      setAttachSmtpServer(false);
      setSelectedSmtpServerId('');
      onClose();
    } catch (error) {
      console.error('Error creating domain:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setDomainName('');
    setAttachSmtpServer(false);
    setSelectedSmtpServerId('');
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

          <div className="flex items-center space-x-2">
            <Checkbox
              id="attach-smtp"
              checked={attachSmtpServer}
              onCheckedChange={(checked) => setAttachSmtpServer(checked as boolean)}
              disabled={isLoading || activeSmtpServers.length === 0}
            />
            <Label htmlFor="attach-smtp" className="text-sm">
              Rattacher un serveur SMTP existant
            </Label>
          </div>

          {attachSmtpServer && (
            <div className="space-y-2">
              <Label htmlFor="smtp-server">Serveur SMTP</Label>
              {smtpLoading ? (
                <div className="text-sm text-gray-500">Chargement des serveurs...</div>
              ) : activeSmtpServers.length > 0 ? (
                <Select value={selectedSmtpServerId} onValueChange={setSelectedSmtpServerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un serveur SMTP" />
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
              ) : (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Aucun serveur SMTP actif disponible. 
                    Créez d'abord un serveur SMTP dans la section "Serveurs SMTP".
                  </p>
                </div>
              )}
            </div>
          )}

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
              disabled={isLoading || !domainName.trim() || (attachSmtpServer && !selectedSmtpServerId)}
            >
              {isLoading ? 'Création...' : 'Créer le domaine'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
