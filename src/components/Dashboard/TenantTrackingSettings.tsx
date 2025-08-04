import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useTenantTracking } from '@/hooks/useEmailTracking';
import { toast } from 'sonner';
import { Settings, Globe, Palette, Mail, ExternalLink, Save } from 'lucide-react';

export function TenantTrackingSettings() {
  const { tenantConfig, isLoading, updateTrackingConfig } = useTenantTracking();
  
  const [trackingDomain, setTrackingDomain] = useState(tenantConfig?.tracking_domain || '');
  const brandConfigData = tenantConfig?.brand_config as any || {};
  const unsubscribeConfigData = tenantConfig?.unsubscribe_page_config as any || {};

  const [brandConfig, setBrandConfig] = useState({
    logo_url: brandConfigData.logo_url || '',
    primary_color: brandConfigData.primary_color || '#3B82F6',
    secondary_color: brandConfigData.secondary_color || '#64748B',
    company_name: brandConfigData.company_name || '',
    support_email: brandConfigData.support_email || '',
  });
  const [unsubscribeConfig, setUnsubscribeConfig] = useState({
    page_title: unsubscribeConfigData.page_title || 'Désabonnement',
    success_message: unsubscribeConfigData.success_message || 'Vous avez été désabonné avec succès de nos communications.',
    custom_css: unsubscribeConfigData.custom_css || '',
    redirect_url: unsubscribeConfigData.redirect_url || '',
  });

  const handleSave = async () => {
    try {
      await updateTrackingConfig.mutateAsync({
        tracking_domain: trackingDomain || null,
        brand_config: brandConfig,
        unsubscribe_page_config: unsubscribeConfig,
      });
      toast.success('Configuration sauvegardée avec succès');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  const defaultDomain = 'tracking.campaignforge.app';
  const currentDomain = trackingDomain || defaultDomain;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Configuration Tracking & Branding</h1>
      </div>

      {/* Domaine de tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Domaine de tracking personnalisé
          </CardTitle>
          <CardDescription>
            Configurez votre propre domaine pour les liens de tracking et de désabonnement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="tracking-domain">Domaine de tracking</Label>
            <Input
              id="tracking-domain"
              placeholder="track.monentreprise.com"
              value={trackingDomain}
              onChange={(e) => setTrackingDomain(e.target.value)}
            />
            <p className="text-sm text-muted-foreground mt-2">
              Configurez un CNAME: <code>track.monentreprise.com</code> → <code>{defaultDomain}</code>
            </p>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">URLs de tracking actuelles:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Ouvertures</Badge>
                <code>https://{currentDomain}/o/[token]</code>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Clics</Badge>
                <code>https://{currentDomain}/c/[token]</code>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Désabonnement</Badge>
                <code>https://{currentDomain}/u/[token]</code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration branding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Branding de l'entreprise
          </CardTitle>
          <CardDescription>
            Personnalisez l'apparence de vos pages de tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company-name">Nom de l'entreprise</Label>
              <Input
                id="company-name"
                placeholder="Mon Entreprise"
                value={brandConfig.company_name}
                onChange={(e) => setBrandConfig(prev => ({ ...prev, company_name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="support-email">Email de support</Label>
              <Input
                id="support-email"
                type="email"
                placeholder="support@monentreprise.com"
                value={brandConfig.support_email}
                onChange={(e) => setBrandConfig(prev => ({ ...prev, support_email: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="logo-url">URL du logo</Label>
            <Input
              id="logo-url"
              type="url"
              placeholder="https://monentreprise.com/logo.png"
              value={brandConfig.logo_url}
              onChange={(e) => setBrandConfig(prev => ({ ...prev, logo_url: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primary-color">Couleur principale</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={brandConfig.primary_color}
                  onChange={(e) => setBrandConfig(prev => ({ ...prev, primary_color: e.target.value }))}
                  className="w-16 h-10 p-1 border rounded"
                />
                <Input
                  value={brandConfig.primary_color}
                  onChange={(e) => setBrandConfig(prev => ({ ...prev, primary_color: e.target.value }))}
                  placeholder="#3B82F6"
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="secondary-color">Couleur secondaire</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="secondary-color"
                  type="color"
                  value={brandConfig.secondary_color}
                  onChange={(e) => setBrandConfig(prev => ({ ...prev, secondary_color: e.target.value }))}
                  className="w-16 h-10 p-1 border rounded"
                />
                <Input
                  value={brandConfig.secondary_color}
                  onChange={(e) => setBrandConfig(prev => ({ ...prev, secondary_color: e.target.value }))}
                  placeholder="#64748B"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration page de désabonnement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Page de désabonnement
          </CardTitle>
          <CardDescription>
            Personnalisez le contenu de votre page de désabonnement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="page-title">Titre de la page</Label>
              <Input
                id="page-title"
                placeholder="Désabonnement"
                value={unsubscribeConfig.page_title}
                onChange={(e) => setUnsubscribeConfig(prev => ({ ...prev, page_title: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="redirect-url">URL de redirection (optionnel)</Label>
              <Input
                id="redirect-url"
                type="url"
                placeholder="https://monentreprise.com"
                value={unsubscribeConfig.redirect_url}
                onChange={(e) => setUnsubscribeConfig(prev => ({ ...prev, redirect_url: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="success-message">Message de succès</Label>
            <Textarea
              id="success-message"
              placeholder="Vous avez été désabonné avec succès de nos communications."
              value={unsubscribeConfig.success_message}
              onChange={(e) => setUnsubscribeConfig(prev => ({ ...prev, success_message: e.target.value }))}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="custom-css">CSS personnalisé (optionnel)</Label>
            <Textarea
              id="custom-css"
              placeholder=".custom-class { font-weight: bold; }"
              value={unsubscribeConfig.custom_css}
              onChange={(e) => setUnsubscribeConfig(prev => ({ ...prev, custom_css: e.target.value }))}
              rows={4}
              className="font-mono text-sm"
            />
          </div>

          {currentDomain && (
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ExternalLink className="h-4 w-4" />
                <span className="font-medium">Aperçu de l'URL de désabonnement:</span>
              </div>
              <code className="text-sm">https://{currentDomain}/u/[token]</code>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={updateTrackingConfig.isPending}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {updateTrackingConfig.isPending ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
        </Button>
      </div>
    </div>
  );
}