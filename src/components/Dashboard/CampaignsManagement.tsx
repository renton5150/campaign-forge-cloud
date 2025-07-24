import { useState, useEffect } from 'react';
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
  TrendingUp,
  AlertCircle,
  RefreshCw,
  List
} from 'lucide-react';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useEmailQueue } from '@/hooks/useEmailQueue';
import { useContactLists } from '@/hooks/useContactLists';
import { useQueueProcessor } from '@/hooks/useQueueProcessor';
import { Campaign } from '@/types/database';
import CampaignEditor from './CampaignEditor';
import CampaignStats from './CampaignStats';
import { useToast } from '@/hooks/use-toast';
import BlacklistListSelector from './BlacklistListSelector';
import ContactCleaningStats from './ContactCleaningStats';
import { ContactCleaningResult } from '@/utils/contactCleaning';

export default function CampaignsManagement() {
  const { campaigns, isLoading } = useCampaigns();
  const { sendCampaign, getCampaignQueueStats, retryFailedEmails } = useEmailQueue();
  const { contactLists } = useContactLists();
  const { processQueue } = useQueueProcessor();
  const { toast } = useToast();
  
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [queueStats, setQueueStats] = useState<Record<string, any>>({});
  const [selectedBlacklistLists, setSelectedBlacklistLists] = useState<string[]>([]);
  const [cleaningResult, setCleaningResult] = useState<ContactCleaningResult | null>(null);
  const [showCleaningPreview, setShowCleaningPreview] = useState(false);

  // Charger les statistiques de queue pour chaque campagne
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

  const handleSendCampaign = async (campaign: Campaign) => {
    if (!selectedLists.length) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins une liste de contacts",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await sendCampaign.mutateAsync({
        campaignId: campaign.id,
        subject: campaign.subject,
        htmlContent: campaign.html_content,
        contactListIds: selectedLists,
        blacklistListIds: selectedBlacklistLists,
      });

      toast({
        title: "✅ Campagne mise en queue",
        description: `${result.queued} emails ajoutés à la queue après nettoyage de la blacklist`,
      });

      setShowSendModal(false);
      setSelectedLists([]);
      setSelectedBlacklistLists([]);
      setSelectedCampaign(null);
      setCleaningResult(null);
      setShowCleaningPreview(false);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'envoi de la campagne",
        variant: "destructive",
      });
    }
  };

  const handlePreviewCleaning = async () => {
    if (!selectedCampaign || !selectedLists.length) return;

    try {
      const { cleanContactsForCampaign } = await import('@/utils/contactCleaning');
      const result = await cleanContactsForCampaign(
        selectedLists,
        selectedBlacklistLists,
        user?.tenant_id || null
      );
      setCleaningResult(result);
      setShowCleaningPreview(true);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'aperçu du nettoyage",
        variant: "destructive",
      });
    }
  };

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
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => processQueue.mutate()}
            disabled={processQueue.isPending}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {processQueue.isPending ? 'Traitement...' : 'Traiter Queue'}
          </Button>
          <Button onClick={() => setShowEditor(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Campagne
          </Button>
        </div>
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
                   
                   {/* Statistiques de queue */}
                   {queueStats[campaign.id] && queueStats[campaign.id].total > 0 && (
                     <div className="grid grid-cols-4 gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                       <div className="text-center">
                         <div className="text-xs text-gray-500">En attente</div>
                         <div className="font-medium text-orange-600">{queueStats[campaign.id].pending}</div>
                       </div>
                       <div className="text-center">
                         <div className="text-xs text-gray-500">Envoyés</div>
                         <div className="font-medium text-green-600">{queueStats[campaign.id].sent}</div>
                       </div>
                       <div className="text-center">
                         <div className="text-xs text-gray-500">Échoués</div>
                         <div className="font-medium text-red-600">{queueStats[campaign.id].failed}</div>
                       </div>
                       <div className="text-center">
                         <div className="text-xs text-gray-500">Total</div>
                         <div className="font-medium">{queueStats[campaign.id].total}</div>
                       </div>
                     </div>
                   )}
                   
                   <div className="flex justify-between items-center">
                     <div className="flex space-x-2">
                       {campaign.tags?.map((tag) => (
                         <Badge key={tag} variant="secondary" className="text-xs">
                           {tag}
                         </Badge>
                       ))}
                     </div>
                     <div className="flex space-x-2">
                       {campaign.status === 'draft' && (
                         <Button
                           variant="default"
                           size="sm"
                           onClick={() => {
                             setSelectedCampaign(campaign);
                             setShowSendModal(true);
                           }}
                           disabled={sendCampaign.isPending}
                         >
                           <Send className="h-4 w-4 mr-1" />
                           {sendCampaign.isPending ? 'Envoi...' : 'Envoyer Campagne'}
                         </Button>
                       )}
                       
                       {queueStats[campaign.id]?.failed > 0 && (
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => handleRetryFailed(campaign.id)}
                           disabled={retryFailedEmails.isPending}
                         >
                           <RefreshCw className="h-4 w-4 mr-1" />
                           Relancer échoués
                         </Button>
                       )}
                       
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

      {/* Modal pour sélectionner les listes de contacts */}
      {showSendModal && selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Envoyer la campagne</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowSendModal(false);
                  setSelectedLists([]);
                  setSelectedBlacklistLists([]);
                  setSelectedCampaign(null);
                  setCleaningResult(null);
                  setShowCleaningPreview(false);
                }}
              >
                ✕
              </Button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Campagne: <strong>{selectedCampaign.name}</strong>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sélection des listes de contacts */}
              <div>
                <h4 className="font-medium mb-3">Listes de contacts destinataires</h4>
                <div className="max-h-48 overflow-y-auto border rounded-lg p-3">
                  {contactLists?.map((list) => (
                    <div key={list.id} className="flex items-center space-x-2 mb-2">
                      <input
                        type="checkbox"
                        id={`list-${list.id}`}
                        checked={selectedLists.includes(list.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLists([...selectedLists, list.id]);
                          } else {
                            setSelectedLists(selectedLists.filter(id => id !== list.id));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor={`list-${list.id}`} className="flex-1 cursor-pointer">
                        <div className="text-sm text-gray-900">{list.name}</div>
                        <div className="text-xs text-gray-500">{list.total_contacts} contacts</div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sélection des listes de blacklist */}
              <div>
                <BlacklistListSelector
                  selectedListIds={selectedBlacklistLists}
                  onSelectionChange={setSelectedBlacklistLists}
                />
              </div>
            </div>

            {/* Bouton d'aperçu du nettoyage */}
            {selectedLists.length > 0 && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={handlePreviewCleaning}
                  className="w-full"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Aperçu du nettoyage
                </Button>
              </div>
            )}

            {/* Statistiques de nettoyage */}
            {showCleaningPreview && cleaningResult && (
              <div className="mt-4">
                <ContactCleaningStats cleaningResult={cleaningResult} />
              </div>
            )}

            <div className="flex justify-end space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSendModal(false);
                  setSelectedLists([]);
                  setSelectedBlacklistLists([]);
                  setSelectedCampaign(null);
                  setCleaningResult(null);
                  setShowCleaningPreview(false);
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={() => handleSendCampaign(selectedCampaign)}
                disabled={selectedLists.length === 0 || sendCampaign.isPending}
              >
                <Send className="h-4 w-4 mr-1" />
                {sendCampaign.isPending ? 'Envoi...' : `Envoyer ${cleaningResult ? `(${cleaningResult.stats.cleanedCount} contacts)` : `(${selectedLists.length} listes)`}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
