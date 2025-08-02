
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Activity, 
  Play,
  Square,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { useEmailQueueNew } from '@/hooks/useEmailQueueNew';

export function EmailQueueMonitor() {
  const { 
    queueStats, 
    isLoading, 
    startWorker, 
    stopWorker 
  } = useEmailQueueNew();
  
  const [workerStatus, setWorkerStatus] = useState<'stopped' | 'running'>('stopped');

  const handleStartWorker = () => {
    startWorker();
    setWorkerStatus('running');
  };

  const handleStopWorker = () => {
    stopWorker();
    setWorkerStatus('stopped');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  const totalEmails = queueStats?.total || 0;
  const completedEmails = (queueStats?.sent || 0) + (queueStats?.failed || 0);
  const completionRate = totalEmails > 0 ? (completedEmails / totalEmails) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Queue d'envoi d'emails
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={workerStatus === 'running' ? 'default' : 'secondary'}>
              {workerStatus === 'running' ? (
                <>
                  <Activity className="h-3 w-3 mr-1" />
                  Worker actif
                </>
              ) : (
                <>
                  <Square className="h-3 w-3 mr-1" />
                  Worker arrêté
                </>
              )}
            </Badge>
            {workerStatus === 'stopped' ? (
              <Button onClick={handleStartWorker} size="sm" className="bg-green-600 hover:bg-green-700">
                <Play className="h-4 w-4 mr-2" />
                Démarrer
              </Button>
            ) : (
              <Button onClick={handleStopWorker} size="sm" variant="outline">
                <Square className="h-4 w-4 mr-2" />
                Arrêter
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistiques principales */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {queueStats?.pending || 0}
            </div>
            <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" />
              En attente
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {queueStats?.processing || 0}
            </div>
            <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
              <Activity className="h-3 w-3" />
              En cours
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {queueStats?.sent || 0}
            </div>
            <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Envoyés
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {queueStats?.failed || 0}
            </div>
            <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
              <XCircle className="h-3 w-3" />
              Échecs
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">
              {totalEmails}
            </div>
            <div className="text-sm text-gray-500">
              Total
            </div>
          </div>
        </div>

        {/* Barre de progression */}
        {totalEmails > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Progression globale</span>
              <span className="font-medium">{completionRate.toFixed(1)}%</span>
            </div>
            <Progress value={completionRate} className="h-2" />
            <div className="text-xs text-gray-500 text-center">
              {completedEmails} / {totalEmails} emails traités
            </div>
          </div>
        )}

        {/* Alertes */}
        {queueStats && queueStats.failed > 0 && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-800">
              {queueStats.failed} emails ont échoué. Vérifiez la configuration SMTP.
            </span>
          </div>
        )}

        {totalEmails === 0 && (
          <div className="text-center py-8">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucun email en queue</p>
            <p className="text-sm text-gray-500">
              Les emails apparaîtront ici après le lancement d'une campagne
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
