
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

interface SmtpTestEmailModalProps {
  open: boolean;
  onClose: () => void;
  server: SmtpServer;
}

export default function SmtpTestEmailModal({ open, onClose, server }: SmtpTestEmailModalProps) {
  const { user } = useAuth();
  const { testConnection, testing, lastTest } = useSmtpConnectionTest();
  const [testEmail, setTestEmail] = useState(user?.email || '');

  const handleSendTest = async () => {
    if (!testEmail.trim()) return;

    console.log('🎯 Démarrage du test d\'envoi d\'email...', {
      server: server.name,
      testEmail: testEmail.trim()
    });

    try {
      const result = await testConnection({
        host: server.host,
        port: server.port,
        username: server.username,
        password: server.password,
        from_email: server.from_email,
        from_name: server.from_name,
        test_email: testEmail.trim(),
        encryption: server.encryption || 'tls'
      });

      console.log('📊 Résultat du test:', result);

      if (result.success) {
        // Fermer le modal seulement si le test réussit
        setTimeout(() => onClose(), 2000);
      }
    } catch (error) {
      console.error('💥 Erreur lors du test d\'envoi:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Test d'envoi d'email - {server.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informations du serveur */}
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
            <p className="text-xs text-gray-500 mt-1">
              Un email de test sera envoyé à cette adresse pour vérifier le bon fonctionnement du serveur SMTP.
            </p>
          </div>

          {/* Résultat du test */}
          {lastTest && (
            <Card className={lastTest.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-sm font-medium ${lastTest.success ? 'text-green-800' : 'text-red-800'}`}>
                    {lastTest.success ? '✅ Test réussi' : '❌ Test échoué'}
                  </span>
                </div>
                {lastTest.message && (
                  <p className={`text-sm ${lastTest.success ? 'text-green-700' : 'text-red-700'}`}>
                    {lastTest.message}
                  </p>
                )}
                {lastTest.error && (
                  <p className="text-sm text-red-700 mt-1">
                    <strong>Erreur :</strong> {lastTest.error}
                  </p>
                )}
                {lastTest.details && typeof lastTest.details === 'string' && (
                  <p className="text-xs text-gray-600 mt-2">
                    <strong>Détails :</strong> {lastTest.details}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Indicateur de progression */}
          {testing && (
            <div className="flex items-center justify-center p-4">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">Test en cours... (max 30s)</span>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={testing}>
              {testing ? 'Test en cours...' : 'Fermer'}
            </Button>
            <Button 
              onClick={handleSendTest} 
              disabled={testing || !testEmail.trim()}
            >
              {testing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Envoi en cours...
                </>
              ) : (
                'Envoyer email de test'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
