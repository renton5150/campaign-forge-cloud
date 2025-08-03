
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
  Info,
  Server
} from 'lucide-react';

interface SmtpConnectionDiagnosticProps {
  server: SmtpServer;
  onClose: () => void;
}

// Fonction pour analyser les erreurs de manière dynamique
const getErrorAnalysis = (error: string, serverHost: string) => {
  const hostLower = serverHost.toLowerCase();
  
  // Détection du type de serveur
  let serverType = 'SMTP Générique';
  let specificSuggestions: string[] = [];
  
  if (hostLower.includes('turbo-smtp.com')) {
    serverType = 'Turbo SMTP';
    specificSuggestions = [
      'Le serveur Turbo SMTP est connu pour être lent',
      'Essayez le port 587 (STARTTLS) au lieu du port 465 (SSL)',
      'Attendez 15-30 secondes pour les opérations'
    ];
  } else if (hostLower.includes('ovh.net') || hostLower.includes('7tic')) {
    serverType = '7TIC/OVH';
    specificSuggestions = [
      'Pour OVH/7tic, utilisez votre adresse email complète comme nom d\'utilisateur',
      'Vérifiez les paramètres de sécurité de votre compte OVH',
      'Port 465 (SSL) ou 587 (STARTTLS) sont recommandés'
    ];
  } else if (hostLower.includes('gmail.com')) {
    serverType = 'Gmail';
    specificSuggestions = [
      'Utilisez un mot de passe d\'application, pas votre mot de passe principal',
      'Activez l\'authentification à 2 facteurs',
      'Port 587 avec STARTTLS recommandé'
    ];
  } else if (hostLower.includes('outlook') || hostLower.includes('live.com')) {
    serverType = 'Outlook/Hotmail';
    specificSuggestions = [
      'Utilisez l\'authentification moderne OAuth2 si possible',
      'Vérifiez les paramètres de sécurité Microsoft',
      'Port 587 avec STARTTLS recommandé'
    ];
  }

  // Analyse de l'erreur
  if (error.includes('Limite SMTP dépassée') || error.includes('566')) {
    return {
      type: `LIMITE DÉPASSÉE - ${serverType}`,
      severity: 'high',
      description: `Le serveur ${serverType} a atteint sa limite d'envoi`,
      suggestions: [
        'Attendez 5-10 minutes avant de retenter le test',
        `Les serveurs ${serverType} limitent le nombre d'emails par minute`,
        'Évitez de tester trop fréquemment la même configuration',
        ...specificSuggestions
      ]
    };
  }
  
  if (error.includes('Authentification') || error.includes('535')) {
    return {
      type: `AUTHENTIFICATION - ${serverType}`,
      severity: 'medium',
      description: `Authentification échouée sur ${serverType}`,
      suggestions: [
        'Vérifiez votre nom d\'utilisateur et mot de passe',
        'Assurez-vous que le compte n\'est pas verrouillé',
        ...specificSuggestions
      ]
    };
  }
  
  if (error.includes('550')) {
    return {
      type: `ADRESSE EMAIL - ${serverType}`,
      severity: 'medium',
      description: `Adresse email rejetée par ${serverType}`,
      suggestions: [
        'Vérifiez l\'adresse email de destination',
        'Assurez-vous que l\'adresse existe',
        `Vérifiez les restrictions du serveur ${serverType}`,
        ...specificSuggestions
      ]
    };
  }
  
  if (error.includes('connexion') || error.includes('timeout')) {
    return {
      type: `CONNEXION - ${serverType}`,
      severity: 'high',
      description: `Impossible de se connecter au serveur ${serverType}`,
      suggestions: [
        `Vérifiez que ${serverHost} est accessible`,
        'Contrôlez les paramètres de firewall',
        'Testez la connectivité réseau',
        'Vérifiez les paramètres de chiffrement (TLS/SSL)',
        ...specificSuggestions
      ]
    };
  }
  
  return {
    type: `ERREUR - ${serverType}`,
    severity: 'medium',
    description: `Erreur détectée avec ${serverType}`,
    suggestions: [
      'Consultez les logs détaillés ci-dessous',
      `Contactez le support de ${serverType}`,
      'Vérifiez la configuration du serveur',
      ...specificSuggestions
    ]
  };
};

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

            {/* Configuration serveur avec détection automatique */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Server className="h-4 w-4" />
                Configuration testée:
              </h4>
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
                      <strong>Détails:</strong> {lastTest.details}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Analyse d'erreur dynamique */}
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
                      const analysis = getErrorAnalysis(lastTest.error, server.host || '');
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
