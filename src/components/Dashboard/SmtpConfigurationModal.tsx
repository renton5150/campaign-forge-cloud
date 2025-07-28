import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { SmtpServer, SmtpServerFormData, SmtpServerType } from '@/hooks/useSmtpServers';

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
  server?: SmtpServer;
  onSave?: (data: SmtpServerFormData) => Promise<void>;
  onConfigured?: (smtpConfig: SmtpConfig) => void;
  domainName?: string;
}

export default function SmtpConfigurationModal({ 
  open, 
  onClose, 
  server, 
  onSave, 
  onConfigured, 
  domainName 
}: SmtpConfigurationModalProps) {
  const [formData, setFormData] = useState<SmtpServerFormData>({
    name: '',
    type: 'smtp' as SmtpServerType,
    host: '',
    port: 587,
    username: '',
    password: '',
    api_key: '',
    domain: '',
    region: '',
    encryption: 'tls',
    from_name: '',
    from_email: '',
    is_active: true,
    daily_limit: 10000,
    hourly_limit: 1000,
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (server) {
      console.log('Loading server data:', server);
      setFormData({
        name: server.name || '',
        type: server.type as SmtpServerType,
        host: server.host || '',
        port: server.port || 587,
        username: server.username || '',
        password: server.password || '',
        api_key: server.api_key || '',
        domain: server.domain || '',
        region: server.region || '',
        encryption: server.encryption || 'tls',
        from_name: server.from_name || '',
        from_email: server.from_email || '',
        is_active: server.is_active !== false,
        daily_limit: (server as any).daily_limit || 10000,
        hourly_limit: (server as any).hourly_limit || 1000,
      });
    } else {
      setFormData({
        name: '',
        type: 'smtp' as SmtpServerType,
        host: '',
        port: 587,
        username: '',
        password: '',
        api_key: '',
        domain: '',
        region: '',
        encryption: 'tls',
        from_name: '',
        from_email: '',
        is_active: true,
        daily_limit: 10000,
        hourly_limit: 1000,
      });
    }
  }, [server, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      console.log('Submitting form data:', formData);
      
      // If this is for domain configuration, use onConfigured
      if (onConfigured && domainName) {
        const smtpConfig: SmtpConfig = {
          provider: formData.type,
          host: formData.host,
          port: formData.port,
          username: formData.username,
          password: formData.password,
          apiKey: formData.api_key,
          fromEmail: formData.from_email,
          fromName: formData.from_name,
        };
        onConfigured(smtpConfig);
      } else if (onSave) {
        // Regular SMTP server management
        await onSave(formData);
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving SMTP server:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof SmtpServerFormData, value: any) => {
    console.log(`Updating field ${field} with value:`, value);
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getModalTitle = () => {
    if (domainName) {
      return `Configuration SMTP pour ${domainName}`;
    }
    return server ? 'Modifier le serveur SMTP' : 'Ajouter un serveur SMTP';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{getModalTitle()}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nom du serveur *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Ex: 7tic"
                required
              />
            </div>

            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="smtp">SMTP (serveur SMTP classique)</SelectItem>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                  <SelectItem value="mailgun">Mailgun</SelectItem>
                  <SelectItem value="amazon_ses">Amazon SES</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-medium">Configuration SMTP</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="host">Hôte *</Label>
                <Input
                  id="host"
                  value={formData.host}
                  onChange={(e) => handleInputChange('host', e.target.value)}
                  placeholder="ssl0.ovh.net"
                  required
                />
              </div>

              <div>
                <Label htmlFor="port">Port *</Label>
                <Input
                  id="port"
                  type="number"
                  value={formData.port}
                  onChange={(e) => handleInputChange('port', parseInt(e.target.value) || 587)}
                  placeholder="587"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">Nom d'utilisateur *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="laura.decoster@7tic.fr"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Mot de passe *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Laissez vide pour conserver"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="encryption">Chiffrement</Label>
              <Select 
                value={formData.encryption || 'tls'} 
                onValueChange={(value) => {
                  console.log('Encryption value changed to:', value);
                  handleInputChange('encryption', value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez le chiffrement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  <SelectItem value="tls">TLS</SelectItem>
                  <SelectItem value="ssl">SSL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-medium">Expéditeur par défaut</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="from_name">Nom expéditeur *</Label>
                <Input
                  id="from_name"
                  value={formData.from_name}
                  onChange={(e) => handleInputChange('from_name', e.target.value)}
                  placeholder="Laura Decoster"
                  required
                />
              </div>

              <div>
                <Label htmlFor="from_email">Email expéditeur *</Label>
                <Input
                  id="from_email"
                  type="email"
                  value={formData.from_email}
                  onChange={(e) => handleInputChange('from_email', e.target.value)}
                  placeholder="laura.decoster@7tic.fr"
                  required
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-medium">Paramètres avancés</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="daily_limit">Limite quotidienne</Label>
                <Input
                  id="daily_limit"
                  type="number"
                  value={formData.daily_limit}
                  onChange={(e) => handleInputChange('daily_limit', parseInt(e.target.value) || 10000)}
                  placeholder="10000"
                />
              </div>

              <div>
                <Label htmlFor="hourly_limit">Limite horaire</Label>
                <Input
                  id="hourly_limit"
                  type="number"
                  value={formData.hourly_limit}
                  onChange={(e) => handleInputChange('hourly_limit', parseInt(e.target.value) || 1000)}
                  placeholder="1000"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleInputChange('is_active', checked)}
              />
              <Label htmlFor="is_active">Serveur actif</Label>
              <span className="text-sm text-gray-500">
                Ce serveur peut être utilisé pour l'envoi d'emails
              </span>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Enregistrement...' : domainName ? 'Configurer' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
