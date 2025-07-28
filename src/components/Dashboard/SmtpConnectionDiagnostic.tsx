import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSmtpConnectionTest, ConnectionTestResult } from '@/hooks/useSmtpConnectionTest';
import { SmtpServer } from '@/hooks/useSmtpServers';
import { 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Settings,
  RefreshCw,
  Info
} from 'lucide-react';

interface SmtpConnectionDiagnosticProps {
  server: SmtpServer;
  onClose: () => void;
}

export default function SmtpConnectionDiagnostic({ 
  server, 
  onClose
}: SmtpConnectionDiagnosticProps) {
  const [showDiagnostic, setShowDiagnostic] = useState(true);
  const [testCount, setTestCount] = useState(0);
  const { testConnection, testing, lastTest } = useSmtpConnectionTest();

  const handleTest = async () => {
    setTestCount(prev => prev + 1);
    await testConnection(server);
  };

  const handleClose = () => {
    setShowDiagnostic(false);
    if (onClose) {
      onClose();
    }
  };

  const getErrorAnalysis = (error: string) => {
    if (error.includes('Limite SMTP dépassée') || error.includes('566')) {
      return {
        type: 'LIMITE DÉPASSÉE',
        severity: 'high',
        description: 'Le serveur SMTP a atteint sa limite d\'envoi',
        suggestions: [
          'Attendez 5-10 minutes avant de retenter le test',
          'Les serveurs SMTP limitent le nombre d\'emails par minute',
          'Évitez de tester trop fréquemment la même configuration',
          'Contactez votre fournisseur SMTP pour connaître les limites'
        ]
      };
    }
    
    if (error.includes('Authentification impossible') || error.includes('535')) {
      return {
        type: 'AUTHENTIFICATION',
        severity: 'medium',
        description: 'Authentification SMTP échouée',
        suggestions: [
          'Vérifiez votre nom d\'utilisateur et mot de passe',
          'Assurez-vous que le compte n\'est pas verrouillé',
          'Pour OVH/7tic, utilisez votre adresse email complète comme nom d\'utilisateur',
          'Vérifiez les paramètres d\'authentification requis'
        ]
      };
    }
    
    if (error.includes('550')) {
      return {
        type: 'ADRESSE EMAIL',
        severity: 'medium',
        description: 'Adresse email rejetée',
        suggestions: [
          'Vérifiez l\'adresse email de destination',
          'Assurez-vous que l\'adresse existe',
          'Vérifiez les restrictions du serveur SMTP'
        ]
      };
    }
    
    if (error.includes('connexion')) {
      return {
        type: 'CONNEXION',
        severity: 'high',
        description: 'Impossible de se connecter au serveur SMTP',
        suggestions: [
          'Vérifiez l\'adresse du serveur et le port',
          'Contrôlez les paramètres de firewall',
          'Testez la connectivité réseau',
          'Vérifiez les paramètres de chiffrement (TLS/SSL)'
        ]
      };
    }
    
    return {
      type: 'ERREUR GÉNÉRALE',
      severity: 'medium',
      description: 'Erreur non spécifique détectée',
      suggestions: [
        'Consultez les logs détaillés ci-dessous',
        'Contactez votre fournisseur SMTP',
        'Vérifiez la configuration du serveur'
      ]
    };
  };

  if (!showDiagnostic) {
    return (
      <Button 
        variant="outline" 
        onClick={() => setShowDiagnostic(true)}
        className="w-full"
      >
        <TestTube className="h-4 w-4 mr-2" />
        Diagnostic SMTP avancé
      </Button>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Diagnostic SMTP avancé
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleClose}
          >
            ×
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleTest}
            disabled={testing}
            className="flex-1"
          >
            {testing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Test en cours...
              </>
            ) : (
              <>
                <Settings className="h-4 w-4 mr-2" />
                Tester la connexion {testCount > 0 && `(${testCount})`}
              </>
            )}
          </Button>
        </div>

        {testCount > 2 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Vous avez effectué {testCount} tests. Pour éviter les limites du serveur SMTP, 
              attendez quelques minutes entre les tests.
            </AlertDescription>
          </Alert>
        )}

        {lastTest && (
          <div className="space-y-4">
            <Separator />
            
            {/* Résumé du test */}
            <div className="flex items-center gap-2">
              {lastTest.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">
                {lastTest.success ? 'Test réussi' : 'Test échoué'}
              </span>
            </div>

            {/* Configuration serveur */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="font-medium mb-2">Configuration testée:</h4>
              <div className="text-sm space-y-1">
                <div><strong>Serveur:</strong> {server.host}:{server.port}</div>
                <div><strong>Utilisateur:</strong> {server.username}</div>
                <div><strong>Email expéditeur:</strong> {server.from_email}</div>
                <div><strong>Type d'authentification:</strong> AUTO (PLAIN/LOGIN)</div>
              </div>
            </div>

            {/* Message de succès */}
            {lastTest.success && lastTest.message && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {lastTest.message}
                  {lastTest.details && (
                    <div className="mt-2 text-sm">
                      <strong>Détails:</strong>
                      <ul className="list-disc list-inside mt-1">
                        <li>Message ID: {lastTest.details.messageId}</li>
                        <li>Serveur: {lastTest.details.server}</li>
                        <li>Timestamp: {lastTest.details.timestamp}</li>
                      </ul>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Analyse d'erreur */}
            {!lastTest.success && lastTest.error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div><strong>Erreur:</strong> {lastTest.error}</div>
                    {lastTest.details && (
                      <div><strong>Détails:</strong> {lastTest.details}</div>
                    )}
                    {(() => {
                      const analysis = getErrorAnalysis(lastTest.error);
                      return (
                        <div className="mt-2">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={analysis.severity === 'high' ? 'destructive' : 'default'}>
                              {analysis.type}
                            </Badge>
                          </div>
                          <div className="text-sm mb-2">{analysis.description}</div>
                          <div className="text-sm">
                            <strong>Suggestions:</strong>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                              {analysis.suggestions.map((suggestion, index) => (
                                <li key={index}>{suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
