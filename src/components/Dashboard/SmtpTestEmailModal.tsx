
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useSmtpConnectionTest } from '@/hooks/useSmtpConnectionTest';
import { SmtpServer } from '@/hooks/useSmtpServers';
import { useAuth } from '@/hooks/useAuth';

interface SmtpTestEmailModalProps {
  open: boolean;
  onClose: () => void;
  server: SmtpServer;
}

export default function SmtpTestEmailModal({ open, onClose, server }: SmtpTestEmailModalProps) {
  const { user } = useAuth();
  const { testConnection, testing } = useSmtpConnectionTest();
  const [testEmail, setTestEmail] = useState(user?.email || '');

  const handleSendTest = async () => {
    if (!testEmail.trim()) return;

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

      if (result.success) {
        onClose();
      }
    } catch (error) {
      console.error('Erreur lors du test d\'envoi:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Test d'envoi d'email</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            <p>Serveur : <span className="font-medium">{server.name}</span></p>
            <p>Hôte : <span className="font-medium">{server.host}:{server.port}</span></p>
            <p>Expéditeur : <span className="font-medium">{server.from_email}</span></p>
          </div>

          <div>
            <Label htmlFor="test_email">Adresse email de test</Label>
            <Input
              id="test_email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Entrez l'adresse email de test"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Un email de test sera envoyé à cette adresse pour vérifier le bon fonctionnement du serveur SMTP.
            </p>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button 
              onClick={handleSendTest} 
              disabled={testing || !testEmail.trim()}
            >
              {testing ? 'Envoi en cours...' : 'Envoyer email de test'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
