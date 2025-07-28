
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const UnsubscribePage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [tokenData, setTokenData] = useState<any>(null);

  const predefinedReasons = [
    'Je ne souhaite plus recevoir d\'emails',
    'Je reçois trop d\'emails',
    'Le contenu ne m\'intéresse pas',
    'Je n\'ai pas demandé à recevoir ces emails',
    'Autre raison'
  ];

  useEffect(() => {
    if (!token) {
      setError('Token de désabonnement manquant');
      setIsVerifying(false);
      return;
    }

    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      setIsVerifying(true);
      
      // Vérifier que le token existe et n'a pas expiré
      const { data, error } = await supabase
        .from('unsubscribe_tokens')
        .select('*')
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        setError('Token de désabonnement invalide ou expiré');
        return;
      }

      setTokenData(data);
      setEmail(data.email);
      setError('');
    } catch (err) {
      console.error('Erreur lors de la vérification du token:', err);
      setError('Erreur lors de la vérification du token');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token || !tokenData) {
      setError('Token invalide');
      return;
    }

    if (!email.trim()) {
      setError('L\'email est requis');
      return;
    }

    if (email.toLowerCase() !== tokenData.email.toLowerCase()) {
      setError('L\'email ne correspond pas au token');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const finalReason = reason === 'Autre raison' ? customReason : reason;
      
      // Obtenir l'adresse IP et user agent
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      
      // Appeler la fonction de désabonnement
      const { data, error } = await supabase.rpc('process_unsubscription', {
        p_token: token,
        p_email: email,
        p_tenant_id: tokenData.tenant_id,
        p_campaign_id: tokenData.campaign_id,
        p_reason: finalReason,
        p_ip_address: ipData.ip,
        p_user_agent: navigator.userAgent
      });

      if (error) {
        throw error;
      }

      const result = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (!result.success) {
        setError(result.error || 'Erreur lors du désabonnement');
        return;
      }

      setIsSuccess(true);
    } catch (err) {
      console.error('Erreur lors du désabonnement:', err);
      setError('Une erreur s\'est produite lors du désabonnement');
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Vérification du token...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-green-700">Désabonnement réussi</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">
              Vous avez été désabonné avec succès. Vous ne recevrez plus d'emails à cette adresse.
            </p>
            <Button 
              onClick={() => navigate('/')}
              className="w-full"
            >
              Retourner à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !tokenData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-700">Erreur</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">{error}</p>
            <Button 
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full"
            >
              Retourner à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Mail className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <CardTitle>Se désabonner</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Nous sommes désolés de vous voir partir. Veuillez confirmer votre désabonnement.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUnsubscribe} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Raison du désabonnement (optionnel)</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisissez une raison" />
                </SelectTrigger>
                <SelectContent>
                  {predefinedReasons.map((predefinedReason) => (
                    <SelectItem key={predefinedReason} value={predefinedReason}>
                      {predefinedReason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {reason === 'Autre raison' && (
              <div className="space-y-2">
                <Label htmlFor="customReason">Précisez votre raison</Label>
                <Textarea
                  id="customReason"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Expliquez-nous pourquoi vous souhaitez vous désabonner..."
                  className="w-full"
                  rows={3}
                />
              </div>
            )}

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Désabonnement en cours...
                </>
              ) : (
                'Se désabonner'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnsubscribePage;
