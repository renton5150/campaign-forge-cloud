
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
  Server, 
  AlertTriangle,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import { useEmailQueueMetrics } from '@/hooks/useEmailQueueMetrics';
import { useQueueProcessor } from '@/hooks/useQueueProcessor';

interface EmailQueueDashboardProps {
  campaignId?: string;
}

export function EmailQueueDashboard({ campaignId }: EmailQueueDashboardProps) {
  const { metrics, smtpMetrics, isLoading, refresh } = useEmailQueueMetrics(campaignId);
  const { processQueue, isProcessing } = useQueueProcessor();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleProcessQueue = async () => {
    await processQueue.mutateAsync();
    setTimeout(refresh, 2000); // Rafraîchir après 2 secondes
  };

  const formatTimeAgo = (date: string | null) => {
    if (!date) return 'Jamais';
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Il y a ${diffDays}j`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des métriques...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Impossible de charger les métriques de la queue d'emails.
        </AlertDescription>
      </Alert>
    );
  }

  const totalEmails = metrics.totalPending + metrics.totalProcessing + metrics.totalSent + metrics.totalFailed;
  const completionRate = totalEmails > 0 ? ((metrics.totalSent + metrics.totalFailed) / totalEmails) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header avec contrôles */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Queue d'emails</h2>
          <p className="text-gray-600">
            Dernière mise à jour: {formatTimeAgo(lastRefresh.toISOString())}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={refresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button 
            onClick={handleProcessQueue} 
            disabled={isProcessing || metrics.totalPending === 0}
            size="sm"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Traitement...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Traiter la queue
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metrics.totalPending}</div>
            <p className="text-xs text-gray-500">Emails à traiter</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En cours</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.totalProcessing}</div>
            <p className="text-xs text-gray-500">En traitement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Envoyés</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.totalSent}</div>
            <p className="text-xs text-gray-500">Succès</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Échoués</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.totalFailed}</div>
            <p className="text-xs text-gray-500">Erreurs</p>
          </CardContent>
        </Card>
      </div>

      {/* Progrès et performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Progression
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Campagne complétée</span>
                <span className="text-sm font-medium">{completionRate.toFixed(1)}%</span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Débit/heure</div>
                <div className="font-medium">{metrics.throughputPerHour} emails</div>
              </div>
              <div>
                <div className="text-gray-600">Taux d'erreur</div>
                <div className="font-medium">{metrics.errorRate.toFixed(1)}%</div>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              Dernier traitement: {formatTimeAgo(metrics.lastProcessedAt)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Serveurs SMTP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {smtpMetrics.map((server) => (
                <div key={server.serverId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      server.isHealthy ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <div className="font-medium">{server.serverName}</div>
                      <div className="text-sm text-gray-500">
                        {server.totalSent} envoyés, {server.totalFailed} échoués
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={server.isHealthy ? 'default' : 'destructive'}>
                      {server.successRate.toFixed(1)}%
                    </Badge>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatTimeAgo(server.lastUsed)}
                    </div>
                  </div>
                </div>
              ))}
              
              {smtpMetrics.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <Server className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Aucun serveur SMTP configuré</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes */}
      {metrics.errorRate > 10 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Taux d'erreur élevé ({metrics.errorRate.toFixed(1)}%). Vérifiez la configuration des serveurs SMTP.
          </AlertDescription>
        </Alert>
      )}

      {smtpMetrics.some(server => !server.isHealthy) && (
        <Alert variant="destructive">
          <Server className="h-4 w-4" />
          <AlertDescription>
            Certains serveurs SMTP ne sont pas en bonne santé. Vérifiez leur statut.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
