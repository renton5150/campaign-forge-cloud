
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useSmtpConnectionTest } from '@/hooks/useSmtpConnectionTest';
import { SmtpServer } from '@/hooks/useSmtpServers';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Zap, Clock, Server } from 'lucide-react';

interface SmtpTestEmailModalProps {
  open: boolean;
  onClose: () => void;
  server: SmtpServer | null;
}

// Fonction pour détecter le type de serveur SMTP
function getServerInfo(host: string | null) {
  if (!host) return { type: 'Unknown', color: 'default' as const };
  
  const hostLower = host.toLowerCase();
  
  if (hostLower.includes('turbo-smtp.com')) {
    return { 
      type: 'Turbo SMTP', 
      color: 'destructive' as const,
      isKnownSlow: true,
      recommendations: [
        'Ce serveur est connu pour être lent (15-30 secondes)',
        'Port 587 (STARTTLS) recommandé pour de meilleures performances',
        'Port 465 (SSL) fonctionne mais plus lent'
      ]
    };
  }
  
  if (hostLower.includes('ovh.net') || hostLower.includes('7tic')) {
    return { 
      type: '7TIC/OVH', 
      color: 'default' as const,
      isKnownSlow: false,
      recommendations: [
        'Utilisez votre adresse email complète comme nom d\'utilisateur',
        'Port 465 (SSL) ou 587 (STARTTLS) recommandés',
        'Vérifiez les paramètres de sécurité OVH'
      ]
    };
  }
  
  if (hostLower.includes('gmail.com') || hostLower.includes('google.com')) {
    return { 
      type: 'Gmail', 
      color: 'default' as const,
      isKnownSlow: false,
      recommendations: [
        'Utilisez un mot de passe d\'application, pas votre mot de passe principal',
        'Activez l\'authentification à 2 facteurs',
        'Port 587 avec STARTTLS recommandé'
      ]
    };
  }
  
  if (hostLower.includes('outlook') || hostLower.includes('live.com') || hostLower.includes('hotmail')) {
    return { 
      type: 'Outlook/Hotmail', 
      color: 'default' as const,
      isKnownSlow: false,
      recommendations: [
        'Utilisez l\'authentification moderne si possible',
        'Port 587 avec STARTTLS recommandé',
        'Vérifiez les paramètres de sécurité Microsoft'
      ]
    };
  }
  
  return { 
    type: 'SMTP Générique', 
    color: 'secondary' as const,
    isKnownSlow: false,
    recommendations: [
      'Consultez la documentation de votre fournisseur SMTP',
      'Vérifiez les ports et protocoles supportés'
    ]
  };
}

export default function SmtpTestEmailModal({ open, onClose, server }: SmtpTestEmailModalProps) {
  const { user } = useAuth();
  const { testConnection, testing, lastTest } = useSmtpConnectionTest();
  const [testEmail, setTestEmail] = useState(user?.email || '');
  const [testMode, setTestMode] = useState<'full' | 'quick'>('full');

  // Return early if server is null
  if (!server) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Test d'envoi d'email</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p>Aucun serveur sélectionné</p>
            <Button onClick={onClose} className="mt-4">Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const handleSendTest = async () => {
    if (!testEmail.trim()) return;

    console.log('🎯 [MODAL] Démarrage du test d\'envoi d\'email...', {
      server: server.name,
      host: server.host,
      testEmail: testEmail.trim(),
      mode: testMode
    });

    await testConnection({
      host: server.host,
      port: server.port,
      username: server.username,
      password: server.password,
      from_email: server.from_email,
      from_name: server.from_name,
      test_email: testEmail.trim(),
      encryption: server.encryption || 'tls'
    }, testMode === 'full');
  };

  const handleTest7TicAlternatives = async () => {
    console.log('🔍 [MODAL] Test de toutes les alternatives 7TIC...');
    
    // Utiliser l'API directe pour tester les alternatives
    try {
      const response = await fetch('https://tvzmqkdgapkbktgtlhco.supabase.co/functions/v1/test-smtp-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2em1xa2RnYXBrYmt0Z3RsaGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMTQzODUsImV4cCI6MjA2NjY5MDM4NX0.Oq8XQcEuSBkpnOQB6S3FHvuUz6yJekoaV4Q7Ngs5Ix8`
        },
        body: JSON.stringify({
          type: '7tic_alternatives',
          username: server.username,
          password: server.password
        })
      });

      const result = await response.json();
      console.log('📊 [MODAL] Résultat test alternatives:', result);
      
    } catch (error) {
      console.error('❌ [MODAL] Erreur test alternatives:', error);
    }
  };

  const serverInfo = getServerInfo(server.host);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Test d'envoi - {server.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Configuration du serveur avec détection automatique */}
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Type détecté :</span>
                  <Badge variant={serverInfo.color}>{serverInfo.type}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Serveur :</span>
                  <span className="font-medium">{server.host}:{server.port}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Utilisateur :</span>
                  <span className="font-medium">{server.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Expéditeur :</span>
                  <span className="font-medium">{server.from_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Chiffrement :</span>
                  <Badge variant="outline">{server.encryption || 'TLS'}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommandations spécifiques au serveur détecté */}
          {serverInfo.recommendations && (
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Recommandations pour {serverInfo.type} :</strong>
                <ul className="text-sm mt-1 space-y-1 list-disc list-inside">
                  {serverInfo.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Avertissement pour serveurs lents */}
          {serverInfo.isKnownSlow && (
            <Alert className="border-amber-200 bg-amber-50">
              <Clock className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Serveur {serverInfo.type} détecté</strong>
                <p className="text-sm mt-1">
                  Ce serveur est connu pour être lent (15-30 secondes). 
                  Utilisez le test rapide pour vérifier la connectivité uniquement.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Mode de test */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Mode de test</Label>
            <div className="flex gap-2">
              <Button
                variant={testMode === 'quick' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTestMode('quick')}
                className="flex-1"
              >
                <Zap className="w-4 h-4 mr-2" />
                Test rapide
              </Button>
              <Button
                variant={testMode === 'full' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTestMode('full')}
                className="flex-1"
              >
                <Clock className="w-4 h-4 mr-2" />
                Test complet
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {testMode === 'quick' 
                ? 'Vérifie uniquement la connectivité TCP au serveur' 
                : 'Teste la connexion complète et envoie un vrai email'}
            </p>
          </div>

          {/* Email de test */}
          <div>
            <Label htmlFor="test_email">Adresse email de test</Label>
            <Input
              id="test_email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Entrez l'adresse email de test"
              required
              disabled={testing}
            />
          </div>

          {/* État du test */}
          {testing && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-blue-800">
                    {testMode === 'quick' ? 'Test rapide en cours...' : 'Test complet en cours...'}
                  </span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  {testMode === 'quick' 
                    ? 'Vérification de la connectivité TCP...'
                    : serverInfo.isKnownSlow 
                      ? `Connexion au serveur ${serverInfo.type} (peut prendre 15-30 secondes)...`
                      : `Connexion au serveur ${serverInfo.type} et envoi de l'email de test...`}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Résultat du test */}
          {!testing && lastTest && (
            <Card className={lastTest.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${lastTest.success ? 'text-green-800' : 'text-red-800'}`}>
                      {lastTest.success ? '✅ Test réussi' : '❌ Test échoué'}
                    </span>
                    {lastTest.responseTime && (
                      <Badge variant="outline" className="text-xs">
                        {lastTest.responseTime}ms
                      </Badge>
                    )}
                  </div>
                  
                  {lastTest.message && (
                    <p className={`text-sm ${lastTest.success ? 'text-green-700' : 'text-red-700'}`}>
                      {lastTest.message}
                    </p>
                  )}
                  
                  {lastTest.error && (
                    <p className="text-sm text-red-700">
                      <strong>Erreur :</strong> {lastTest.error}
                    </p>
                  )}
                  
                  {lastTest.details && (
                    <p className="text-xs text-gray-600">
                      <strong>Détails :</strong> {lastTest.details}
                    </p>
                  )}

                  {lastTest.suggestions && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-700">Suggestions :</p>
                      <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
                        {lastTest.suggestions.map((suggestion, index) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bouton spécial pour 7TIC/OVH */}
          {serverInfo.type === '7TIC/OVH' && (
            <Alert className="border-orange-200 bg-orange-50">
              <Info className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Problème détecté avec {server.host}:{server.port} ?</strong>
                <p className="text-sm mt-1">
                  Testez automatiquement toutes les configurations alternatives 7TIC/OVH disponibles.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2 border-orange-300 text-orange-700 hover:bg-orange-100"
                  onClick={handleTest7TicAlternatives}
                  disabled={testing}
                >
                  🔍 Tester toutes les configs 7TIC
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={testing}>
              Fermer
            </Button>
            <Button 
              onClick={handleSendTest} 
              disabled={testing || !testEmail.trim()}
            >
              {testing ? 'Test en cours...' : testMode === 'quick' ? 'Test rapide' : 'Test complet'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
