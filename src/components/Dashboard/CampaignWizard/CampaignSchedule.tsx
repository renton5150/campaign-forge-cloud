
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
  const [retryCount, setRetryCount] = useState(0);
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

      if (error) {
        console.error('Erreur lors de l\'envoi du test:', error);
        const errorMessage = error.message || 'Impossible d\'envoyer l\'email de test';
        setLastError(errorMessage);
        
        // Messages d'erreur spécifiques basés sur le code d'erreur
        if (error.message?.includes('Limite SMTP atteinte') || error.message?.includes('566')) {
          toast({
            title: 'Limite SMTP atteinte',
            description: 'Votre serveur SMTP a atteint sa limite d\'envoi. Veuillez attendre ou vérifier votre quota.',
            variant: 'destructive',
          });
        } else if (error.message?.includes('authentification') || error.message?.includes('535')) {
          toast({
            title: 'Erreur d\'authentification',
            description: 'Vérifiez vos identifiants SMTP dans la configuration.',
            variant: 'destructive',
          });
        } else if (error.message?.includes('Aucun serveur SMTP configuré')) {
          toast({
            title: 'Serveur SMTP manquant',
            description: 'Aucun serveur SMTP configuré. Allez dans Configuration > Serveurs SMTP.',
            variant: 'destructive',
          });
        } else if (error.message?.includes('connexion') || error.message?.includes('ECONNECTION')) {
          toast({
            title: 'Erreur de connexion',
            description: 'Impossible de se connecter au serveur SMTP. Vérifiez la configuration.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Erreur d\'envoi',
            description: errorMessage,
            variant: 'destructive',
          });
        }
        setRetryCount(prev => prev + 1);
        return;
      }

      if (!data?.success) {
        const errorMessage = data?.error || 'Erreur inconnue lors de l\'envoi';
        setLastError(errorMessage);
        toast({
          title: 'Erreur d\'envoi',
          description: errorMessage,
          variant: 'destructive',
        });
        setRetryCount(prev => prev + 1);
        return;
      }

      console.log('Test email envoyé avec succès:', data);
      toast({
        title: '✅ Test envoyé',
        description: `Email de test envoyé à ${testEmail}`,
      });
      setTestEmail('');
      setLastError(null);
      setRetryCount(0);
      
    } catch (error) {
      console.error('Erreur lors de l\'envoi du test:', error);
      const errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet.';
      setLastError(errorMessage);
      toast({
        title: 'Erreur de connexion',
        description: errorMessage,
        variant: 'destructive',
      });
      setRetryCount(prev => prev + 1);
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

  const getRetryMessage = () => {
    if (retryCount >= 3) {
      return "Trop de tentatives échouées. Vérifiez votre configuration SMTP ou contactez votre administrateur.";
    }
    if (lastError?.includes('Limite SMTP atteinte')) {
      return "Limite SMTP atteinte. Attendez quelques minutes avant de réessayer ou vérifiez votre quota d'envoi.";
    }
    return lastError;
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
                disabled={!testEmail || sendingTest || !formData.html_content || retryCount >= 3}
                className="w-full"
              >
                {sendingTest ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Envoi en cours...
                  </>
                ) : retryCount > 0 ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Réessayer ({retryCount}/3)
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
                    <strong>Erreur d'envoi:</strong> {getRetryMessage()}
                  </AlertDescription>
                </Alert>
              )}

              {retryCount >= 3 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Suggestions:</strong>
                    <ul className="mt-2 list-disc pl-4 space-y-1">
                      <li>Vérifiez votre configuration SMTP</li>
                      <li>Attendez quelques minutes si la limite est atteinte</li>
                      <li>Contactez votre fournisseur SMTP</li>
                      <li>Vérifiez votre quota d'envoi</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <Alert>
                <TestTube className="h-4 w-4" />
                <AlertDescription>
                  Nous recommandons fortement de tester votre campagne avant l'envoi définitif.
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
