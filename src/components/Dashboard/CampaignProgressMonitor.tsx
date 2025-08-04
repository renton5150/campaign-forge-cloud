import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Activity, 
  Play,
  AlertTriangle,
  RefreshCw,
  Pause
} from 'lucide-react';
import { useEmailQueueNew } from '@/hooks/useEmailQueueNew';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CampaignProgress {
  campaignId: string;
  campaignName: string;
  status: string;
  totalEmails: number;
  sentEmails: number;
  failedEmails: number;
  processingEmails: number;
  pendingEmails: number;
  lastProcessedAt: string | null;
  errorMessage: string | null;
  progressPercentage: number;
}

export function CampaignProgressMonitor() {
  const [campaigns, setCampaigns] = useState<CampaignProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [retryingCampaign, setRetryingCampaign] = useState<string | null>(null);
  const { retryFailed } = useEmailQueueNew();
  const { toast } = useToast();

  const fetchCampaignProgress = async () => {
    try {
      const { data: campaignsList } = await supabase
        .from('campaigns')
        .select('id, name, status')
        .in('status', ['sending', 'sent', 'scheduled']);

      if (!campaignsList) return;

      const progressData: CampaignProgress[] = [];

      for (const campaign of campaignsList) {
        const { data: queueData } = await supabase
          .from('email_queue')
          .select('status, updated_at, error_message')
          .eq('campaign_id', campaign.id);

        if (!queueData) continue;

        const totalEmails = queueData.length;
        const sentEmails = queueData.filter(q => q.status === 'sent').length;
        const failedEmails = queueData.filter(q => q.status === 'failed').length;
        const processingEmails = queueData.filter(q => q.status === 'processing').length;
        const pendingEmails = queueData.filter(q => q.status === 'pending').length;
        
        const lastProcessed = queueData
          .filter(q => q.status === 'sent')
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];

        const lastFailed = queueData
          .filter(q => q.status === 'failed')
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];

        const progressPercentage = totalEmails > 0 ? ((sentEmails + failedEmails) / totalEmails) * 100 : 0;

        progressData.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          status: campaign.status,
          totalEmails,
          sentEmails,
          failedEmails,
          processingEmails,
          pendingEmails,
          lastProcessedAt: lastProcessed?.updated_at || null,
          errorMessage: lastFailed?.error_message || null,
          progressPercentage
        });
      }

      setCampaigns(progressData);
    } catch (error) {
      console.error('Erreur lors de la récupération du progrès:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaignProgress();
    const interval = setInterval(fetchCampaignProgress, 10000); // Mise à jour toutes les 10 secondes
    return () => clearInterval(interval);
  }, []);

  const handleResumeCampaign = async (campaignId: string, campaignName: string) => {
    try {
      setRetryingCampaign(campaignId);
      await retryFailed(campaignId);
      toast({
        title: "Campagne reprise",
        description: `La campagne "${campaignName}" a été reprise avec succès`,
      });
      fetchCampaignProgress();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de reprendre la campagne",
        variant: "destructive",
      });
    } finally {
      setRetryingCampaign(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  const activeCampaigns = campaigns.filter(c => c.totalEmails > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Suivi des Campagnes en Cours
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {activeCampaigns.length === 0 ? (
          <div className="text-center py-8">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucune campagne active</p>
          </div>
        ) : (
          activeCampaigns.map((campaign) => (
            <div key={campaign.campaignId} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{campaign.campaignName}</h4>
                  <Badge variant={campaign.status === 'sending' ? 'default' : 'secondary'}>
                    {campaign.status === 'sending' ? 'En cours' : campaign.status}
                  </Badge>
                </div>
                {campaign.failedEmails > 0 && (
                  <Button
                    onClick={() => handleResumeCampaign(campaign.campaignId, campaign.campaignName)}
                    size="sm"
                    variant="outline"
                    disabled={retryingCampaign === campaign.campaignId}
                  >
                    {retryingCampaign === campaign.campaignId ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Reprise...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Reprendre
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Statistiques détaillées */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-600">{campaign.pendingEmails}</div>
                  <div className="text-muted-foreground">En attente</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{campaign.processingEmails}</div>
                  <div className="text-muted-foreground">En cours</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{campaign.sentEmails}</div>
                  <div className="text-muted-foreground">Envoyés</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">{campaign.failedEmails}</div>
                  <div className="text-muted-foreground">Échecs</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-foreground">{campaign.totalEmails}</div>
                  <div className="text-muted-foreground">Total</div>
                </div>
              </div>

              {/* Barre de progression */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progression</span>
                  <span className="font-medium">{campaign.progressPercentage.toFixed(1)}%</span>
                </div>
                <Progress value={campaign.progressPercentage} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  {campaign.sentEmails + campaign.failedEmails} / {campaign.totalEmails} emails traités
                </div>
              </div>

              {/* Position exacte */}
              {campaign.lastProcessedAt && (
                <div className="text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 inline mr-1" />
                  Dernier envoi: {new Date(campaign.lastProcessedAt).toLocaleString('fr-FR')}
                </div>
              )}

              {/* Alertes d'erreur */}
              {campaign.errorMessage && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Dernière erreur:</strong> {campaign.errorMessage}
                  </AlertDescription>
                </Alert>
              )}

              {/* Temps estimé de fin */}
              {campaign.processingEmails > 0 && campaign.pendingEmails > 0 && (
                <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                  <Activity className="h-3 w-3 inline mr-1" />
                  Emails restants: {campaign.pendingEmails + campaign.processingEmails} 
                  - Estimation: {Math.ceil((campaign.pendingEmails + campaign.processingEmails) / 150)} minutes
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}