
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSmtpConnectionTest, ConnectionTestResult } from '@/hooks/useSmtpConnectionTest';
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
  serverData: any;
  isOpen?: boolean;
}

export default function SmtpConnectionDiagnostic({ serverData, isOpen = false }: SmtpConnectionDiagnosticProps) {
  const [showDiagnostic, setShowDiagnostic] = useState(isOpen);
  const { testConnection, testing, lastTest } = useSmtpConnectionTest();

  const handleTest = async () => {
    await testConnection(serverData);
  };

  const getStepIcon = (step: any) => {
    if (step.success) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (step.error) return <XCircle className="h-4 w-4 text-red-500" />;
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  const getStepStatusColor = (step: any) => {
    if (step.success) return 'bg-green-100 text-green-800';
    if (step.error) return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getErrorAnalysis = (error: string) => {
    if (error.includes('566')) {
      return {
        type: 'LIMITE SMTP',
        severity: 'high',
        description: 'Le serveur SMTP indique que vous avez atteint une limite',
        suggestions: [
          'Vérifiez vos quotas auprès de votre fournisseur SMTP',
          'Attendez la réinitialisation des limites (généralement horaire/quotidienne)',
          'Contactez votre administrateur système',
          'Vérifiez la réputation de votre domaine expéditeur'
        ]
      };
    }
    
    if (error.includes('authentication')) {
      return {
        type: 'AUTHENTIFICATION',
        severity: 'medium',
        description: 'Problème d\'authentification avec le serveur SMTP',
        suggestions: [
          'Vérifiez votre nom d\'utilisateur et mot de passe',
          'Assurez-vous que le compte n\'est pas verrouillé',
          'Vérifiez les paramètres d\'authentification requis'
        ]
      };
    }
    
    if (error.includes('connection')) {
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
            onClick={() => setShowDiagnostic(false)}
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
                Tester la connexion
              </>
            )}
          </Button>
        </div>

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
            {lastTest.server_config && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-medium mb-2">Configuration testée:</h4>
                <div className="text-sm space-y-1">
                  <div><strong>Serveur:</strong> {lastTest.server_config.host}:{lastTest.server_config.port}</div>
                  <div><strong>Chiffrement:</strong> {lastTest.server_config.encryption || 'Aucun'}</div>
                </div>
              </div>
            )}

            {/* Analyse d'erreur */}
            {!lastTest.success && lastTest.error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div><strong>Erreur:</strong> {lastTest.error}</div>
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

            {/* Étapes détaillées */}
            {lastTest.steps && lastTest.steps.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Étapes du test:</h4>
                {lastTest.steps.map((step, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                    {getStepIcon(step)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={getStepStatusColor(step)}>
                          {step.step}
                        </Badge>
                        {step.code && (
                          <Badge variant="secondary">
                            {step.code}
                          </Badge>
                        )}
                      </div>
                      {step.message && (
                        <div className="text-sm text-gray-600 mb-1">{step.message}</div>
                      )}
                      {step.analysis && (
                        <div className="text-sm text-gray-700 bg-white p-2 rounded border-l-2 border-blue-200">
                          <Info className="h-3 w-3 inline mr-1" />
                          {step.analysis}
                        </div>
                      )}
                      {step.error && (
                        <div className="text-sm text-red-600 mt-1">
                          <strong>Erreur:</strong> {step.error}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
