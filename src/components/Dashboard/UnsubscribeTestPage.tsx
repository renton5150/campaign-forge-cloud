
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useUnsubscribe } from '@/hooks/useUnsubscribe';
import { addUnsubscribeLinkToContent } from '@/utils/unsubscribeUtils';
import { useAuth } from '@/hooks/useAuth';
import { Copy, ExternalLink, Mail, TestTube } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const UnsubscribeTestPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { generateUnsubscribeUrl } = useUnsubscribe();
  
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [generatedToken, setGeneratedToken] = useState('');
  const [unsubscribeUrl, setUnsubscribeUrl] = useState('');
  const [htmlTemplate, setHtmlTemplate] = useState(`<html>
<body>
  <h2>Newsletter Test</h2>
  <p>Bonjour {{PRENOM}},</p>
  <p>Ceci est un email de test pour vérifier le système de désabonnement.</p>
  <p>Votre email: {{EMAIL}}</p>
  <p>Entreprise: {{ENTREPRISE}}</p>
  
  <hr>
  <p><small>
    Vous recevez cet email car vous êtes inscrit à notre newsletter.
    <br>
    <a href="{{unsubscribe_link}}" style="color: #666;">Se désabonner</a>
  </small></p>
</body>
</html>`);
  const [processedHtml, setProcessedHtml] = useState('');

  // Fonction pour obtenir un tenant_id pour les tests (super_admin)
  const getTestTenantId = async () => {
    if (user?.tenant_id) {
      return user.tenant_id;
    }
    
    // Pour les super_admin, utiliser le premier tenant disponible
    if (user?.role === 'super_admin') {
      const { data: tenants, error } = await supabase
        .from('tenants')
        .select('id')
        .limit(1)
        .single();
      
      if (error || !tenants) {
        throw new Error('Aucun tenant trouvé pour les tests');
      }
      
      return tenants.id;
    }
    
    throw new Error('Utilisateur non authentifié ou sans tenant');
  };

  const handleGenerateToken = async () => {
    try {
      console.log('Generating token for:', testEmail);
      
      const tenantId = await getTestTenantId();
      console.log('Using tenant ID:', tenantId);
      
      // Appel direct à la fonction RPC correcte
      const { data, error } = await supabase.rpc('create_unsubscribe_token', {
        p_email: testEmail,
        p_tenant_id: tenantId,
        p_campaign_id: null
      });
      
      if (error) {
        console.error('RPC error:', error);
        throw error;
      }
      
      console.log('Token generated:', data);
      
      setGeneratedToken(data);
      const url = generateUnsubscribeUrl(data);
      setUnsubscribeUrl(url);
      
      toast({
        title: "Token généré",
        description: `Token créé pour ${testEmail}`,
      });
    } catch (error) {
      console.error('Erreur lors de la génération du token:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de générer le token",
        variant: "destructive",
      });
    }
  };

  const handleProcessTemplate = async () => {
    try {
      console.log('Processing template for:', testEmail);
      
      const tenantId = await getTestTenantId();
      console.log('Using tenant ID for template:', tenantId);
      
      const processed = await addUnsubscribeLinkToContent(
        htmlTemplate,
        testEmail,
        tenantId,
        undefined
      );
      
      console.log('Template processed successfully');
      setProcessedHtml(processed);
      
      toast({
        title: "Template traité",
        description: "Le lien de désabonnement a été ajouté au template",
      });
    } catch (error) {
      console.error('Erreur lors du traitement du template:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de traiter le template",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copié",
      description: "Lien copié dans le presse-papiers",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <TestTube className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Test du système de désabonnement</h1>
      </div>

      {/* Génération de token */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            1. Génération d'un token de test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="testEmail">Email de test</Label>
              <Input
                id="testEmail"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleGenerateToken}
                className="w-full"
              >
                Générer Token
              </Button>
            </div>
          </div>

          {generatedToken && (
            <div className="space-y-2">
              <Label>Token généré:</Label>
              <div className="flex items-center gap-2">
                <Input value={generatedToken} readOnly className="font-mono text-sm" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(generatedToken)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {unsubscribeUrl && (
            <div className="space-y-2">
              <Label>URL de désabonnement:</Label>
              <div className="flex items-center gap-2">
                <Input value={unsubscribeUrl} readOnly className="font-mono text-sm" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(unsubscribeUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(unsubscribeUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template HTML */}
      <Card>
        <CardHeader>
          <CardTitle>2. Test d'intégration dans un template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="htmlTemplate">Template HTML avec {`{{unsubscribe_link}}`}</Label>
            <Textarea
              id="htmlTemplate"
              value={htmlTemplate}
              onChange={(e) => setHtmlTemplate(e.target.value)}
              className="font-mono text-sm"
              rows={10}
            />
          </div>
          
          <Button onClick={handleProcessTemplate} className="w-full">
            Traiter le template
          </Button>

          {processedHtml && (
            <div className="space-y-2">
              <Label>Template traité avec lien de désabonnement:</Label>
              <Textarea
                value={processedHtml}
                readOnly
                className="font-mono text-sm"
                rows={12}
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(processedHtml)}
                >
                  <Copy className="h-4 w-4" />
                  Copier HTML
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const blob = new Blob([processedHtml], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                  Prévisualiser
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>3. Instructions de test</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm">
            <li>1. Générez un token pour un email de test</li>
            <li>2. Cliquez sur le lien "URL de désabonnement" pour accéder à la page</li>
            <li>3. Testez le formulaire de désabonnement</li>
            <li>4. Vérifiez que le contact est ajouté à la blacklist</li>
            <li>5. Vérifiez que le statut du contact passe à "unsubscribed"</li>
          </ol>
        </CardContent>
      </Card>

      {/* Debug info */}
      {user?.role === 'super_admin' && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="text-yellow-800">Mode Super Admin</CardTitle>
          </CardHeader>
          <CardContent className="text-yellow-700">
            <p>Vous êtes connecté en tant que super_admin. Le système utilise automatiquement le premier tenant disponible pour les tests.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UnsubscribeTestPage;
