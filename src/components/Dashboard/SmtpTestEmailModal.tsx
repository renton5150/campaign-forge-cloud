
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
import { Info, Zap, Clock } from 'lucide-react';

interface SmtpTestEmailModalProps {
  open: boolean;
  onClose: () => void;
  server: SmtpServer | null;
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

  const isTurboSmtp = server.host?.includes('turbo-smtp.com');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Test d'envoi d'email - {server.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Configuration du serveur */}
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm space-y-2">
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

          {/* Avertissement spécifique Turbo SMTP */}
          {isTurboSmtp && (
            <Alert className="border-amber-200 bg-amber-50">
              <Clock className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Serveur Turbo SMTP détecté</strong>
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
                Test rapide (5s)
              </Button>
              <Button
                variant={testMode === 'full' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTestMode('full')}
                className="flex-1"
              >
                <Clock className="w-4 h-4 mr-2" />
                Test complet (30s)
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {testMode === 'quick' 
                ? 'Vérifie uniquement la connectivité TCP au serveur SMTP' 
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
                    : isTurboSmtp 
                      ? 'Connexion au serveur Turbo SMTP (peut prendre 15-30 secondes)...'
                      : 'Connexion au serveur SMTP et envoi de l\'email de test...'}
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

          {/* Informations sur les ports pour Turbo SMTP */}
          {isTurboSmtp && (
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Ports recommandés pour Turbo SMTP :</strong>
                <ul className="text-sm mt-1 space-y-1">
                  <li>• Port 587 (STARTTLS) - Plus rapide</li>
                  <li>• Port 465 (SSL) - Sécurisé mais plus lent</li>
                  <li>• Port 25 (SMTP) - Non recommandé</li>
                </ul>
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
