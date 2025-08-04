import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { SmtpServer, SmtpServerFormData } from '@/hooks/useSmtpServers';
import { useSendingDomains } from '@/hooks/useSendingDomains';
import { CheckCircle, AlertTriangle } from 'lucide-react';

interface SmtpConfigurationModalProps {
  open: boolean;
  onClose: () => void;
  server?: SmtpServer;
  onSave?: (data: SmtpServerFormData) => void;
  onConfigured?: (config: any) => void;
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
  const { domains } = useSendingDomains();
  const [formData, setFormData] = useState<SmtpServerFormData>({
    name: '',
    type: 'smtp',
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
  });

  // Filtrer les domaines vérifiés
  const verifiedDomains = domains.filter(d => d.status === 'verified');

  useEffect(() => {
    if (server) {
      setFormData({
        name: server.name,
        type: server.type as any,
        host: server.host || '',
        port: server.port || 587,
        username: server.username || '',
        password: server.password || '', // Garder le mot de passe existant même s'il est masqué
        api_key: server.api_key || '',
        domain: server.domain || '',
        region: server.region || '',
        encryption: server.encryption || 'tls',
        from_name: server.from_name,
        from_email: server.from_email,
        is_active: server.is_active,
      });
    } else {
      // Réinitialiser le formulaire pour un nouveau serveur
      setFormData({
        name: '',
        type: 'smtp',
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
      });
    }
  }, [server]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (onConfigured) {
      // Mode configuration pour domaine
      const config = {
        provider: formData.type,
        host: formData.host,
        port: formData.port,
        username: formData.username,
        password: formData.password,
        apiKey: formData.api_key,
        fromEmail: formData.from_email,
        fromName: formData.from_name
      };
      onConfigured(config);
    } else if (onSave) {
      // Mode création/modification de serveur SMTP
      onSave(formData);
    }
  };

  const handleInputChange = (field: keyof SmtpServerFormData, value: any) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        [field]: value
      };
      
      // Auto-configure encryption based on port for 7TIC/OVH
      if (field === 'port') {
        if (value === 465) {
          updated.encryption = 'ssl';
        } else if (value === 587) {
          updated.encryption = 'tls';
        }
      }
      
      return updated;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {domainName ? `Configuration SMTP pour ${domainName}` : 
             server ? 'Modifier le serveur SMTP' : 'Nouveau serveur SMTP'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Domaine vérifié requis */}
          {!domainName && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">🔒 Domaine d'envoi requis</CardTitle>
              </CardHeader>
              <CardContent>
                {verifiedDomains.length > 0 ? (
                  <div className="space-y-2">
                    <Label htmlFor="sending_domain">Domaine d'envoi vérifié</Label>
                    <Select onValueChange={(value) => handleInputChange('domain', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un domaine vérifié" />
                      </SelectTrigger>
                      <SelectContent>
                        {verifiedDomains.map((domain) => (
                          <SelectItem key={domain.id} value={domain.domain}>
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span>{domain.domain}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-orange-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">Aucun domaine vérifié. Créez d'abord un domaine d'envoi.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Configuration de base */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nom du serveur</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Mon serveur SMTP"
                required
              />
            </div>
            <div>
              <Label htmlFor="type">Type de serveur</Label>
              <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="smtp">SMTP Générique</SelectItem>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                  <SelectItem value="mailgun">Mailgun</SelectItem>
                  <SelectItem value="amazon_ses">Amazon SES</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Configuration SMTP */}
          {formData.type === 'smtp' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="host">Hôte SMTP</Label>
                <Input
                  id="host"
                  value={formData.host}
                  onChange={(e) => handleInputChange('host', e.target.value)}
                  placeholder="smtp.gmail.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  type="number"
                  value={formData.port}
                  onChange={(e) => handleInputChange('port', parseInt(e.target.value))}
                  placeholder="587"
                  required
                />
              </div>
              <div>
                <Label htmlFor="username">Nom d'utilisateur</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder={server ? "••••••••" : "Mot de passe"}
                  required={!server} // Mot de passe requis seulement pour nouveau serveur
                />
              </div>
              <div>
                <Label htmlFor="encryption">Chiffrement</Label>
                <Select value={formData.encryption} onValueChange={(value) => handleInputChange('encryption', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    <SelectItem value="tls">TLS</SelectItem>
                    <SelectItem value="ssl">SSL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Configuration API pour services tiers */}
          {formData.type !== 'smtp' && (
            <div>
              <Label htmlFor="api_key">Clé API</Label>
              <Input
                id="api_key"
                value={formData.api_key}
                onChange={(e) => handleInputChange('api_key', e.target.value)}
                placeholder="Votre clé API"
                required
              />
            </div>
          )}

          {/* Configuration expéditeur */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="from_name">Nom expéditeur</Label>
              <Input
                id="from_name"
                value={formData.from_name}
                onChange={(e) => handleInputChange('from_name', e.target.value)}
                placeholder="Mon Entreprise"
                required
              />
            </div>
            <div>
              <Label htmlFor="from_email">Email expéditeur</Label>
              <Input
                id="from_email"
                type="email"
                value={formData.from_email}
                onChange={(e) => handleInputChange('from_email', e.target.value)}
                placeholder="noreply@mondomaine.com"
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => handleInputChange('is_active', e.target.checked)}
            />
            <Label htmlFor="is_active">Serveur actif</Label>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">
              {domainName ? 'Configurer' : server ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
