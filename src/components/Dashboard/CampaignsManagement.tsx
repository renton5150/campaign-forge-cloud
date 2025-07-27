
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, Activity } from 'lucide-react';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useEmailQueue } from '@/hooks/useEmailQueue';
import { useQueueProcessor } from '@/hooks/useQueueProcessor';
import { Campaign } from '@/types/database';
import { CampaignWizard } from './CampaignWizard';
import CampaignStats from './CampaignStats';
import { EmailQueueDashboard } from './EmailQueueDashboard';
import { useToast } from '@/hooks/use-toast';
import { CampaignsHeader } from './CampaignsList/CampaignsHeader';
import { CampaignsStats } from './CampaignsList/CampaignsStats';
import { CampaignsTable } from './CampaignsList/CampaignsTable';

export default function CampaignsManagement() {
  const { campaigns, isLoading } = useCampaigns();
  const { getCampaignQueueStats, retryFailedEmails } = useEmailQueue();
  const { processQueue } = useQueueProcessor();
  const { toast } = useToast();
  
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [queueStats, setQueueStats] = useState<Record<string, any>>({});

  useEffect(() => {
    if (campaigns) {
      const loadStats = async () => {
        const stats: Record<string, any> = {};
        for (const campaign of campaigns) {
          try {
            stats[campaign.id] = await getCampaignQueueStats(campaign.id);
          } catch (error) {
            console.error('Erreur lors du chargement des stats:', error);
          }
        }
        setQueueStats(stats);
      };
      loadStats();
    }
  }, [campaigns, getCampaignQueueStats]);

  const handleRetryFailed = async (campaignId: string) => {
    try {
      const retried = await retryFailedEmails.mutateAsync(campaignId);
      toast({
        title: "✅ Emails relancés",
        description: `${retried} emails échoués remis en queue`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la relance",
        variant: "destructive",
      });
    }
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowWizard(true);
  };

  const handleViewStats = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setActiveTab('analytics');
  };

  const totalCampaigns = campaigns?.length || 0;
  const draftCampaigns = campaigns?.filter(c => c.status === 'draft').length || 0;
  const sentCampaigns = campaigns?.filter(c => c.status === 'sent').length || 0;
  const scheduledCampaigns = campaigns?.filter(c => c.status === 'scheduled').length || 0;

  if (showWizard) {
    return (
      <CampaignWizard
        campaign={selectedCampaign}
        onClose={() => {
          setShowWizard(false);
          setSelectedCampaign(null);
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des campagnes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <CampaignsHeader
        onNewCampaign={() => setShowWizard(true)}
        onProcessQueue={() => processQueue.mutate()}
        isProcessing={processQueue.isPending}
      />

      <CampaignsStats
        totalCampaigns={totalCampaigns}
        draftCampaigns={draftCampaigns}
        scheduledCampaigns={scheduledCampaigns}
        sentCampaigns={sentCampaigns}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="queue">
            <Activity className="h-4 w-4 mr-2" />
            Queue d'emails
          </TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {campaigns && campaigns.length > 0 ? (
            <CampaignsTable
              campaigns={campaigns}
              queueStats={queueStats}
              onEdit={handleEditCampaign}
              onViewStats={handleViewStats}
              onRetryFailed={handleRetryFailed}
              isRetrying={retryFailedEmails.isPending}
            />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-gray-600">Aucune campagne trouvée</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          <EmailQueueDashboard campaignId={selectedCampaign?.id} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {selectedCampaign ? (
            <CampaignStats campaign={selectedCampaign} />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Sélectionnez une campagne pour voir ses statistiques
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
