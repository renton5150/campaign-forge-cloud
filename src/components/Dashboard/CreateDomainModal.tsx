import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { CreateDomainData } from '@/hooks/useSendingDomains';
import SmtpConfigurationModal from './SmtpConfigurationModal';

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

interface CreateDomainModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (domainData: CreateDomainData, smtpConfig?: SmtpConfig) => Promise<void>;
}

export const CreateDomainModal = ({ open, onClose, onSubmit }: CreateDomainModalProps) => {
  const [domainName, setDomainName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [configureSmtpNow, setConfigureSmtpNow] = useState(false);
  const [showSmtpModal, setShowSmtpModal] = useState(false);
  const [pendingDomainData, setPendingDomainData] = useState<CreateDomainData | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!domainName.trim()) {
      return;
    }

    const domainData: CreateDomainData = {
      domain: domainName.trim()
    };

    if (configureSmtpNow) {
      // Ouvrir le modal SMTP pour configuration immédiate
      setPendingDomainData(domainData);
      setShowSmtpModal(true);
    } else {
      // Créer le domaine sans SMTP
      setIsLoading(true);
      try {
        await onSubmit(domainData);
        setDomainName('');
        setConfigureSmtpNow(false);
        onClose();
      } catch (error) {
        console.error('Error creating domain:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSmtpConfigured = async (smtpConfig: SmtpConfig) => {
    if (!pendingDomainData) return;
    
    setIsLoading(true);
    try {
      await onSubmit(pendingDomainData, smtpConfig);
      setDomainName('');
      setConfigureSmtpNow(false);
      setPendingDomainData(null);
      onClose();
    } catch (error) {
      console.error('Error creating domain with SMTP:', error);
    } finally {
      setIsLoading(false);
      setShowSmtpModal(false);
    }
  };

  const handleClose = () => {
    setDomainName('');
    setConfigureSmtpNow(false);
    setPendingDomainData(null);
    setShowSmtpModal(false);
    onClose();
  };

  return (
    <>
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
                id="configure-smtp"
                checked={configureSmtpNow}
                onCheckedChange={(checked) => setConfigureSmtpNow(checked as boolean)}
                disabled={isLoading}
              />
              <Label htmlFor="configure-smtp" className="text-sm">
                Configurer le serveur SMTP maintenant
              </Label>
            </div>

            {configureSmtpNow && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">📧 Configuration SMTP</h4>
                <p className="text-sm text-blue-800">
                  Après avoir créé le domaine, vous pourrez configurer votre serveur SMTP 
                  pour l'envoi d'emails avec ce domaine.
                </p>
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
                disabled={isLoading || !domainName.trim()}
              >
                {isLoading ? 'Création...' : configureSmtpNow ? 'Configurer SMTP' : 'Créer le domaine'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal SMTP */}
      {pendingDomainData && (
        <SmtpConfigurationModal
          open={showSmtpModal}
          onClose={() => {
            setShowSmtpModal(false);
            setPendingDomainData(null);
          }}
          onConfigured={handleSmtpConfigured}
          domainName={pendingDomainData.domain}
        />
      )}
    </>
  );
};
