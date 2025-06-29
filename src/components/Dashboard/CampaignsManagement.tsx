
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Mail, 
  Send, 
  Clock, 
  Archive, 
  BarChart3,
  Eye,
  MousePointer,
  Users,
  TrendingUp
} from 'lucide-react';
import { useCampaigns } from '@/hooks/useCampaigns';
import { Campaign } from '@/types/database';
import CampaignEditor from './CampaignEditor';
import CampaignStats from './CampaignStats';

export default function CampaignsManagement() {
  const { campaigns, isLoading } = useCampaigns();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'sending': return 'bg-yellow-100 text-yellow-800';
      case 'sent': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-orange-100 text-orange-800';
      case 'archived': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Mail className="h-4 w-4" />;
      case 'scheduled': return <Clock className="h-4 w-4" />;
      case 'sending': return <Send className="h-4 w-4" />;
      case 'sent': return <Send className="h-4 w-4" />;
      case 'paused': return <Clock className="h-4 w-4" />;
      case 'archived': return <Archive className="h-4 w-4" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  // Statistiques globales
  const totalCampaigns = campaigns?.length || 0;
  const draftCampaigns = campaigns?.filter(c => c.status === 'draft').length || 0;
  const sentCampaigns = campaigns?.filter(c => c.status === 'sent').length || 0;
  const scheduledCampaigns = campaigns?.filter(c => c.status === 'scheduled').length || 0;

  if (showEditor) {
    return (
      <CampaignEditor
        campaign={selectedCampaign}
        onClose={() => {
          setShowEditor(false);
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campagnes Email</h1>
          <p className="text-gray-600 mt-2">
            Gérez vos campagnes d'email marketing
          </p>
        </div>
        <Button onClick={() => setShowEditor(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Campagne
        </Button>
      </div>

      {/* Statistiques globales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campagnes</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCampaigns}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Brouillons</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftCampaigns}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planifiées</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledCampaigns}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Envoyées</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sentCampaigns}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4">
            {campaigns?.map((campaign) => (
              <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(campaign.status)}
                      <div>
                        <CardTitle className="text-lg">{campaign.name}</CardTitle>
                        <p className="text-sm text-gray-600">{campaign.subject}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {campaign.is_ab_test && (
                        <Badge variant="outline">A/B Test</Badge>
                      )}
                      <Badge className={getStatusColor(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-sm text-gray-500">De</div>
                      <div className="font-medium">{campaign.from_name}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-500">Créé le</div>
                      <div className="font-medium">
                        {new Date(campaign.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    {campaign.scheduled_at && (
                      <div className="text-center">
                        <div className="text-sm text-gray-500">Planifié pour</div>
                        <div className="font-medium">
                          {new Date(campaign.scheduled_at).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                    {campaign.sent_at && (
                      <div className="text-center">
                        <div className="text-sm text-gray-500">Envoyé le</div>
                        <div className="font-medium">
                          {new Date(campaign.sent_at).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-2">
                      {campaign.tags?.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex space-x-2">
                      {campaign.status === 'sent' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCampaign(campaign);
                            setActiveTab('analytics');
                          }}
                        >
                          <BarChart3 className="h-4 w-4 mr-1" />
                          Stats
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCampaign(campaign);
                          setShowEditor(true);
                        }}
                      >
                        Modifier
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
