import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useEmailTracking } from '@/hooks/useEmailTracking';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Eye, MousePointer, UserX, TrendingUp, Activity, Globe, Users, Mail } from 'lucide-react';

interface AnalyticsDashboardProps {
  campaignId?: string;
}

export function AnalyticsDashboard({ campaignId }: AnalyticsDashboardProps) {
  const { opens, clicks, unsubscribes, isLoading, getTrackingStats } = useEmailTracking(campaignId);
  
  // Données factices pour la démo (remplacer par vraies données)
  const totalSent = 1000;
  const stats = getTrackingStats(totalSent);

  // Préparer les données pour les graphiques
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}h`,
    opens: Math.floor(Math.random() * 50),
    clicks: Math.floor(Math.random() * 20),
  }));

  const deviceData = [
    { name: 'Desktop', value: 45, color: '#3B82F6' },
    { name: 'Mobile', value: 35, color: '#10B981' },
    { name: 'Tablet', value: 20, color: '#F59E0B' },
  ];

  const clientData = [
    { name: 'Gmail', count: 320 },
    { name: 'Outlook', count: 280 },
    { name: 'Apple Mail', count: 150 },
    { name: 'Yahoo', count: 90 },
    { name: 'Autres', count: 160 },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux d'ouverture</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.open_rate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.unique_opens} / {stats.total_sent} emails
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de clic</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.click_rate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.unique_clicks} / {stats.total_sent} emails
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Désabonnements</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unsubscribe_rate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.unsubscribes} désabonnements
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((stats.unique_opens + stats.unique_clicks) / stats.total_sent * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Score d'engagement global
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="timeline">Chronologie</TabsTrigger>
          <TabsTrigger value="devices">Appareils</TabsTrigger>
          <TabsTrigger value="details">Détails</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Graphique activité par heure */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Activité par heure
                </CardTitle>
                <CardDescription>
                  Ouvertures et clics au cours des dernières 24h
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="opens" fill="hsl(var(--primary))" name="Ouvertures" />
                    <Bar dataKey="clicks" fill="hsl(var(--secondary))" name="Clics" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Répartition par client email */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Clients email
                </CardTitle>
                <CardDescription>
                  Répartition des ouvertures par client
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {clientData.map((client, index) => (
                    <div key={client.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }}
                        />
                        <span className="text-sm font-medium">{client.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{client.count}</span>
                        <Badge variant="outline">
                          {((client.count / stats.unique_opens) * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Évolution des performances</CardTitle>
              <CardDescription>
                Tendance des ouvertures et clics dans le temps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="opens" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Ouvertures"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="clicks" 
                    stroke="hsl(var(--secondary))" 
                    strokeWidth={2}
                    name="Clics"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Types d'appareils
                </CardTitle>
                <CardDescription>
                  Répartition des ouvertures par type d'appareil
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {deviceData.map((device) => (
                    <div key={device.name} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{device.name}</span>
                        <span className="text-muted-foreground">{device.value}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${device.value}%`,
                            backgroundColor: device.color
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Engagement par appareil
                </CardTitle>
                <CardDescription>
                  Taux de clic selon le type d'appareil
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {deviceData.map((device, index) => (
                    <div key={device.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: device.color }}
                        />
                        <span className="font-medium">{device.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {(Math.random() * 10 + 5).toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          taux de clic
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Dernières ouvertures */}
            <Card>
              <CardHeader>
                <CardTitle>Dernières ouvertures</CardTitle>
                <CardDescription>
                  {opens.length} ouvertures au total
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {opens.slice(0, 10).map((open) => (
                    <div key={open.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div>
                        <div className="font-medium text-sm">{open.contact_email}</div>
                        <div className="text-xs text-muted-foreground">
                          {open.device_type} • {open.email_client}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(open.opened_at).toLocaleString('fr-FR')}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Derniers clics */}
            <Card>
              <CardHeader>
                <CardTitle>Derniers clics</CardTitle>
                <CardDescription>
                  {clicks.length} clics au total
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {clicks.slice(0, 10).map((click) => (
                    <div key={click.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{click.contact_email}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {click.original_url}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(click.clicked_at).toLocaleString('fr-FR')}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Désabonnements */}
          {unsubscribes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Désabonnements récents</CardTitle>
                <CardDescription>
                  {unsubscribes.length} désabonnements au total
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {unsubscribes.slice(0, 10).map((unsub) => (
                    <div key={unsub.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div>
                        <div className="font-medium text-sm">{unsub.contact_email}</div>
                        {unsub.reason && (
                          <div className="text-xs text-muted-foreground">
                            Raison: {unsub.reason}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(unsub.unsubscribed_at).toLocaleString('fr-FR')}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}