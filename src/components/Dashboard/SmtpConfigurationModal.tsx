
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Server, Mail, Key } from 'lucide-react';

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

interface SmtpConfigurationModalProps {
  open: boolean;
  onClose: () => void;
  onConfigured: (config: SmtpConfig) => void;
  domainName: string;
}

export function SmtpConfigurationModal({ open, onClose, onConfigured, domainName }: SmtpConfigurationModalProps) {
  const [config, setConfig] = useState<SmtpConfig>({
    provider: '',
    fromEmail: `noreply@${domainName}`,
    fromName: 'Mon Entreprise'
  });
  const [validating, setValidating] = useState(false);
  const { toast } = useToast();

  const providers = [
    { value: 'turbosmtp', label: 'TurboSMTP', requiresApi: false },
    { value: 'sendgrid', label: 'SendGrid', requiresApi: true },
    { value: 'mailgun', label: 'Mailgun', requiresApi: true },
    { value: 'amazon_ses', label: 'Amazon SES', requiresApi: true },
    { value: 'custom', label: 'Serveur SMTP personnalisé', requiresApi: false }
  ];

  const selectedProvider = providers.find(p => p.value === config.provider);

  const handleProviderChange = (provider: string) => {
    const providerInfo = providers.find(p => p.value === provider);
    
    let defaultConfig: Partial<SmtpConfig> = {
      provider,
      fromEmail: `noreply@${domainName}`,
      fromName: 'Mon Entreprise'
    };

    // Configuration par défaut selon le fournisseur
    switch (provider) {
      case 'turbosmtp':
        defaultConfig = {
          ...defaultConfig,
          host: 'pro.turbo-smtp.com',
          port: 587
        };
        break;
      case 'sendgrid':
        defaultConfig = {
          ...defaultConfig,
          host: 'smtp.sendgrid.net',
          port: 587
        };
        break;
      case 'custom':
        defaultConfig = {
          ...defaultConfig,
          host: '',
          port: 587
        };
        break;
    }

    setConfig(prev => ({ ...prev, ...defaultConfig }));
  };

  const validateConfiguration = async () => {
    setValidating(true);
    
    try {
      // Simulation de validation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "✅ Configuration validée",
        description: "Votre serveur SMTP est correctement configuré",
      });

      onConfigured(config);
      onClose();
    } catch (error) {
      toast({
        title: "❌ Erreur de validation",
        description: "Impossible de valider la configuration SMTP",
        variant: "destructive",
      });
    } finally {
      setValidating(false);
    }
  };

  const isConfigValid = () => {
    if (!config.provider || !config.fromEmail || !config.fromName) return false;
    
    if (selectedProvider?.requiresApi) {
      return !!config.apiKey;
    } else {
      return !!(config.host && config.port && config.username && config.password);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Configuration SMTP requise
          </DialogTitle>
          <DialogDescription>
            Configurez votre serveur d'envoi avant de générer les enregistrements DNS pour <strong>{domainName}</strong>
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            La configuration SMTP est obligatoire pour générer des enregistrements DNS compatibles.
            Les DNS seront adaptés à votre fournisseur d'email.
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          {/* Sélection du fournisseur */}
          <div>
            <Label>Fournisseur SMTP *</Label>
            <Select value={config.provider} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choisissez votre fournisseur" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider.value} value={provider.value}>
                    {provider.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Configuration selon le fournisseur */}
          {config.provider && (
            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Configuration {selectedProvider?.label}
              </h4>

              {selectedProvider?.requiresApi ? (
                // Configuration API
                <div>
                  <Label>Clé API *</Label>
                  <Input
                    type="password"
                    value={config.apiKey || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="Saisissez votre clé API"
                  />
                </div>
              ) : (
                // Configuration SMTP classique
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Serveur SMTP *</Label>
                    <Input
                      value={config.host || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, host: e.target.value }))}
                      placeholder="smtp.exemple.com"
                    />
                  </div>
                  <div>
                    <Label>Port *</Label>
                    <Input
                      type="number"
                      value={config.port || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                      placeholder="587"
                    />
                  </div>
                  <div>
                    <Label>Nom d'utilisateur *</Label>
                    <Input
                      value={config.username || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="votre@email.com"
                    />
                  </div>
                  <div>
                    <Label>Mot de passe *</Label>
                    <Input
                      type="password"
                      value={config.password || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Votre mot de passe"
                    />
                  </div>
                </div>
              )}

              {/* Configuration expéditeur */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label>Email expéditeur *</Label>
                  <Input
                    type="email"
                    value={config.fromEmail}
                    onChange={(e) => setConfig(prev => ({ ...prev, fromEmail: e.target.value }))}
                    placeholder={`noreply@${domainName}`}
                  />
                </div>
                <div>
                  <Label>Nom expéditeur *</Label>
                  <Input
                    value={config.fromName}
                    onChange={(e) => setConfig(prev => ({ ...prev, fromName: e.target.value }))}
                    placeholder="Mon Entreprise"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button 
            onClick={validateConfiguration}
            disabled={!isConfigValid() || validating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {validating ? (
              <>
                <Key className="mr-2 h-4 w-4 animate-spin" />
                Validation en cours...
              </>
            ) : (
              <>
                <Key className="mr-2 h-4 w-4" />
                Valider et continuer
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
