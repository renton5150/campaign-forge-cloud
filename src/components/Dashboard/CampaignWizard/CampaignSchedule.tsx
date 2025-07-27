import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Send, Mail, Calendar, TestTube, AlertTriangle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CampaignScheduleProps {
  formData: any;
  updateFormData: (updates: any) => void;
}

export default function CampaignSchedule({ formData, updateFormData }: CampaignScheduleProps) {
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastSuccess, setLastSuccess] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSendTest = async () => {
    if (!testEmail) {
      toast({
        title: 'Erreur',
        description: 'Veuillez saisir une adresse email pour le test',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.html_content) {
      toast({
        title: 'Erreur',
        description: 'Le contenu de l\'email est requis pour le test',
        variant: 'destructive',
      });
      return;
    }

    setSendingTest(true);
    setLastError(null);
    setLastSuccess(null);
    
    try {
      console.log('Envoi du test email vers:', testEmail);
      
      const { data, error } = await supabase.functions.invoke('send-test-email', {
        body: {
          to: testEmail,
          subject: formData.subject || 'Test - ' + formData.name,
          html_content: formData.html_content,
          from_name: formData.from_name || 'Test',
          from_email: formData.from_email || 'test@example.com'
        }
      });

      // Gérer les erreurs de connexion
      if (error) {
        console.error('Erreur de connexion:', error);
        setLastError('Erreur de connexion au serveur. Veuillez réessayer.');
        toast({
          title: 'Erreur de connexion',
          description: 'Impossible de contacter le serveur d\'envoi. Veuillez réessayer.',
          variant: 'destructive',
        });
        return;
      }

      // Vérifier si l'envoi a réussi
      if (!data?.success) {
        const errorMessage = data?.error || 'Erreur inconnue lors de l\'envoi';
        console.error('Erreur d\'envoi:', data);
        setLastError(errorMessage);
        
        // Messages d'erreur spécifiques selon le type d'erreur
        let userMessage = errorMessage;
        let toastTitle = 'Erreur d\'envoi';
        
        if (errorMessage.includes('limite') || errorMessage.includes('limit') || data?.details?.includes('limite')) {
          userMessage = 'Limite SMTP atteinte. Attendez quelques minutes avant de réessayer ou vérifiez votre quota d\'envoi.';
          toastTitle = 'Limite SMTP atteinte';
        } else if (errorMessage.includes('authentification') || errorMessage.includes('auth')) {
          userMessage = 'Erreur d\'authentification SMTP. Vérifiez la configuration du serveur.';
          toastTitle = 'Erreur d\'authentification';
        } else if (errorMessage.includes('connexion') || errorMessage.includes('connection')) {
          userMessage = 'Erreur de connexion SMTP. Vérifiez la configuration du serveur.';
          toastTitle = 'Erreur de connexion';
        }
        
        toast({
          title: toastTitle,
          description: userMessage,
          variant: 'destructive',
        });
        return;
      }

      console.log('Test email envoyé avec succès:', data);
      setLastSuccess(`Email de test envoyé avec succès à ${testEmail}`);
      toast({
        title: '✅ Test envoyé',
        description: `Email de test envoyé à ${testEmail}`,
      });
      setTestEmail('');
      setLastError(null);
      
    } catch (error) {
      console.error('Erreur lors de l\'envoi du test:', error);
      const errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet.';
      setLastError(errorMessage);
      toast({
        title: 'Erreur de connexion',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSendingTest(false);
    }
  };

  const formatDateTime = (date: Date) => {
    return date.toISOString().slice(0, 16);
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15);
    return formatDateTime(now);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold mb-2">Planification et envoi</h2>
        <p className="text-gray-600">Testez votre campagne et planifiez l'envoi</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Test de la campagne
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="test-email">Email de test</Label>
                <Input
                  id="test-email"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="votre@email.com"
                />
              </div>
              
              <Button 
                onClick={handleSendTest}
                disabled={!testEmail || sendingTest || !formData.html_content}
                className="w-full"
              >
                {sendingTest ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Envoyer un test
                  </>
                )}
              </Button>

              {lastError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Erreur d'envoi:</strong> {lastError}
                  </AlertDescription>
                </Alert>
              )}

              {lastSuccess && (
                <Alert>
                  <TestTube className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Succès:</strong> {lastSuccess}
                  </AlertDescription>
                </Alert>
              )}

              <Alert>
                <TestTube className="h-4 w-4" />
                <AlertDescription>
                  <strong>Tests illimités:</strong> Vous pouvez envoyer autant de tests que nécessaire. 
                  Si vous atteignez une limite SMTP, attendez quelques minutes avant de réessayer.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Planification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.send_immediately ? 'immediate' : 'scheduled'}
              onValueChange={(value) => updateFormData({ send_immediately: value === 'immediate' })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="immediate" id="immediate" />
                <Label htmlFor="immediate" className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Envoyer immédiatement
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="scheduled" id="scheduled" />
                <Label htmlFor="scheduled" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Programmer l'envoi
                </Label>
              </div>
            </RadioGroup>

            {!formData.send_immediately && (
              <div className="mt-4">
                <Label htmlFor="scheduled-date">Date et heure d'envoi</Label>
                <Input
                  id="scheduled-date"
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={(e) => updateFormData({ scheduled_at: e.target.value })}
                  min={getMinDateTime()}
                />
                <p className="text-sm text-gray-500 mt-1">
                  L'envoi doit être programmé au moins 15 minutes à l'avance
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Résumé de la campagne</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Nom :</span>
                  <span className="font-medium">{formData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Objet :</span>
                  <span className="font-medium">{formData.subject}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Expéditeur :</span>
                  <span className="font-medium">{formData.from_email}</span>
                </div>
              </div>
            </div>
            
            <div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Destinataires :</span>
                  <span className="font-medium">{formData.selected_lists?.length || 0} listes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Envoi :</span>
                  <span className="font-medium">
                    {formData.send_immediately ? 'Immédiat' : 'Programmé'}
                  </span>
                </div>
                {!formData.send_immediately && formData.scheduled_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date :</span>
                    <span className="font-medium">
                      {new Date(formData.scheduled_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium mb-2">🚀 Prêt pour l'envoi</h3>
        <p className="text-sm text-gray-700">
          Votre campagne est configurée et prête à être envoyée. 
          Cliquez sur "Finaliser la campagne" pour confirmer l'envoi.
        </p>
      </div>
    </div>
  );
}
