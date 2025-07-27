
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Mail, User, Type } from 'lucide-react';
import { useSmtpServers } from '@/hooks/useSmtpServers';

interface CampaignBasicInfoProps {
  formData: any;
  updateFormData: (updates: any) => void;
}

export default function CampaignBasicInfo({ formData, updateFormData }: CampaignBasicInfoProps) {
  const { servers, loading } = useSmtpServers();
  const [selectedServer, setSelectedServer] = useState<any>(null);

  useEffect(() => {
    if (servers && servers.length > 0 && !selectedServer) {
      const activeServer = servers.find(s => s.is_active) || servers[0];
      if (activeServer) {
        setSelectedServer(activeServer);
        updateFormData({
          smtp_server_id: activeServer.id,
          from_email: activeServer.from_email,
          from_name: activeServer.from_name,
        });
      }
    }
  }, [servers, selectedServer, updateFormData]);

  const handleServerChange = (serverId: string) => {
    const server = servers?.find(s => s.id === serverId);
    if (server) {
      setSelectedServer(server);
      updateFormData({
        smtp_server_id: serverId,
        from_email: server.from_email,
        from_name: server.from_name,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!servers || servers.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Aucun serveur SMTP configuré. Vous devez d'abord configurer un serveur d'envoi dans les paramètres.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold mb-2">Informations de base</h2>
        <p className="text-gray-600">Configurez le nom, l'expéditeur et l'objet de votre campagne</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="h-5 w-5" />
              Nom de la campagne
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="campaign-name">Nom interne *</Label>
              <Input
                id="campaign-name"
                value={formData.name}
                onChange={(e) => updateFormData({ name: e.target.value })}
                placeholder="Ex: Newsletter Mars 2024"
                className="w-full"
              />
              <p className="text-sm text-gray-500">
                Ce nom ne sera visible que par vous et votre équipe
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Expéditeur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="smtp-server">Compte d'envoi *</Label>
                <Select value={formData.smtp_server_id} onValueChange={handleServerChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un compte" />
                  </SelectTrigger>
                  <SelectContent>
                    {servers.map((server) => (
                      <SelectItem key={server.id} value={server.id}>
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{server.name}</div>
                            <div className="text-xs text-gray-500">{server.from_email}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedServer && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm">
                    <div className="font-medium">Email: {selectedServer.from_email}</div>
                    <div className="text-gray-600">Nom: {selectedServer.from_name}</div>
                    <div className="text-gray-600">Type: {selectedServer.type}</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Objet de l'email
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="subject">Ligne d'objet *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => updateFormData({ subject: e.target.value })}
              placeholder="Ex: Découvrez nos nouveautés du mois"
              className="w-full"
            />
            <p className="text-sm text-gray-500">
              Un bon objet incite à ouvrir l'email. Soyez concis et informatif.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium mb-2">💡 Conseils pour un bon objet</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Restez entre 30 et 50 caractères</li>
          <li>• Évitez les mots comme "GRATUIT", "URGENT"</li>
          <li>• Personnalisez avec le prénom du destinataire</li>
          <li>• Testez différents objets avec les tests A/B</li>
        </ul>
      </div>
    </div>
  );
}
