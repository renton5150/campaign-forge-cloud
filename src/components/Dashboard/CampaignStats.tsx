
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Eye, 
  MousePointer, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Mail,
  AlertTriangle,
  Download
} from 'lucide-react';
import { Campaign, CampaignStats as CampaignStatsType } from '@/types/database';
import { useCampaigns } from '@/hooks/useCampaigns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface CampaignStatsProps {
  campaign: Campaign;
}

export default function CampaignStats({ campaign }: CampaignStatsProps) {
  const { getCampaignStats } = useCampaigns();
  const [stats, setStats] = useState<CampaignStatsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const campaignStats = await getCampaignStats(campaign.id);
        setStats(campaignStats);
      } catch (error) {
        console.error('Error loading campaign stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [campaign.id, getCampaignStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-gray-600">Impossible de charger les statistiques</p>
        </CardContent>
      </Card>
    );
  }

  // Calculs des taux
  const openRate = stats.total_sent > 0 ? (stats.unique_opens / stats.total_sent * 100).toFixed(1) : '0.0';
  const clickRate = stats.total_sent > 0 ? (stats.unique_clicks / stats.total_sent * 100).toFixed(1) : '0.0';
  const bounceRate = stats.total_sent > 0 ? (stats.bounced / stats.total_sent * 100).toFixed(1) : '0.0';
  const deliveryRate = stats.total_sent > 0 ? (stats.delivered / stats.total_sent * 100).toFixed(1) : '0.0';

  // Données pour les graphiques
  const performanceData = [
    { name: 'Envoyés', value: stats.total_sent, color: '#3B82F6' },
    { name: 'Livrés', value: stats.delivered, color: '#10B981' },
    { name: 'Ouverts', value: stats.unique_opens, color: '#F59E0B' },
    { name: 'Cliqués', value: stats.unique_clicks, color: '#EF4444' },
  ];

  const bounceData = [
    { name: 'Hard Bounces', value: stats.hard_bounces, color: '#EF4444' },
    { name: 'Soft Bounces', value: stats.soft_bounces, color: '#F59E0B' },
    { name: 'Livrés', value: stats.delivered, color: '#10B981' },
  ];

  const exportStats = () => {
    const data = {
      campaign: campaign.name,
      subject: campaign.subject,
      sent_at: campaign.sent_at,
      stats: {
        total_sent: stats.total_sent,
        delivered: stats.delivered,
        unique_opens: stats.unique_opens,
        unique_clicks: stats.unique_clicks,
        bounced: stats.bounced,
        hard_bounces: stats.hard_bounces,
        soft_bounces: stats.soft_bounces,
        unsubscribes: stats.unsubscribes,
        complaints: stats.complaints,
        open_rate: openRate + '%',
        click_rate: clickRate + '%',
        bounce_rate: bounceRate + '%',
        delivery_rate: deliveryRate + '%'
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-stats-${campaign.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{campaign.name}</h2>
          <p className="text-gray-600">{campaign.subject}</p>
          {campaign.sent_at && (
            <p className="text-sm text-gray-500">
              Envoyé le {new Date(campaign.sent_at).toLocaleDateString()}
            </p>
          )}
        </div>
        <Button onClick={exportStats} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exporter
        </Button>
      </div>

      {/* Métriques principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux d'ouverture</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.unique_opens} ouvertures uniques
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de clic</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clickRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.unique_clicks} clics uniques
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de livraison</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.delivered} emails livrés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de rebond</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bounceRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.bounced} rebonds
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Détails des métriques */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Détails de la performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total envoyés</span>
              <span className="font-medium">{stats.total_sent.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Livrés</span>
              <span className="font-medium text-green-600">{stats.delivered.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Ouvertures totales</span>
              <span className="font-medium">{stats.total_opens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Ouvertures uniques</span>
              <span className="font-medium">{stats.unique_opens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Clics totaux</span>
              <span className="font-medium">{stats.total_clicks.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Clics uniques</span>
              <span className="font-medium">{stats.unique_clicks.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Problèmes et actions négatives</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Hard bounces</span>
              <span className="font-medium text-red-600">{stats.hard_bounces.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Soft bounces</span>
              <span className="font-medium text-orange-600">{stats.soft_bounces.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Désabonnements</span>
              <span className="font-medium text-red-600">{stats.unsubscribes.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Plaintes (spam)</span>
              <span className="font-medium text-red-600">{stats.complaints.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Performance globale</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition des livraisons</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={bounceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {bounceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
