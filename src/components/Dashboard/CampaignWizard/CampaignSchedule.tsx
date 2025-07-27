
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Send, Mail, Calendar, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CampaignScheduleProps {
  formData: any;
  updateFormData: (updates: any) => void;
}

export default function CampaignSchedule({ formData, updateFormData }: CampaignScheduleProps) {
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
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

    setSendingTest(true);
    try {
      // Simuler l'envoi du test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: '✅ Test envoyé',
        description: `Email de test envoyé à ${testEmail}`,
      });
      setTestEmail('');
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer l\'email de test',
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
    now.setMinutes(now.getMinutes() + 15); // Minimum 15 minutes dans le futur
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
                disabled={!testEmail || sendingTest}
                className="w-full"
              >
                {sendingTest ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Envoyer un test
                  </>
                )}
              </Button>

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
