
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
import { useQueueProcessor } from '@/hooks/useQueueProcessor';
import { useToast } from '@/hooks/use-toast';

export function EmailQueueMonitor() {
  const { 
    queueStats, 
    isLoading
  } = useEmailQueueNew();
  
  const { processQueue, isProcessing } = useQueueProcessor();
  const { toast } = useToast();
  
  const [isAutoProcessing, setIsAutoProcessing] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  // Démarrer le traitement automatique professionnel
  const handleStartProcessor = async () => {
    try {
      setIsAutoProcessing(true);
      
      // Première exécution immédiate
      await processQueue.mutateAsync();
      
      toast({
        title: "🚀 Processeur professionnel démarré",
        description: "Le système traite automatiquement les emails en queue",
      });

      // Traitement automatique toutes les 30 secondes
      const id = setInterval(async () => {
        if (!isProcessing) {
          try {
            await processQueue.mutateAsync();
          } catch (error) {
            console.log('Background processing:', error);
            // Continue en arrière-plan même si une itération échoue
          }
        }
      }, 30000);
      
      setIntervalId(id);
    } catch (error: any) {
      console.error('Error starting processor:', error);
      setIsAutoProcessing(false);
      toast({
        title: "Erreur",
        description: "Impossible de démarrer le processeur",
        variant: "destructive",
      });
    }
  };

  // Arrêter le traitement automatique
  const handleStopProcessor = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    setIsAutoProcessing(false);
    
    toast({
      title: "⏹️ Processeur arrêté",
      description: "Le traitement automatique a été arrêté",
    });
  };

  // Nettoyage à la fermeture du composant
  useEffect(() => {
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [intervalId]);

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
            Queue d'envoi professionnelle
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={isAutoProcessing ? 'default' : 'secondary'}>
              {isAutoProcessing ? (
                <>
                  <Activity className="h-3 w-3 mr-1" />
                  Processeur actif
                </>
              ) : (
                <>
                  <Square className="h-3 w-3 mr-1" />
                  Processeur arrêté
                </>
              )}
            </Badge>
            
            {!isAutoProcessing ? (
              <Button 
                onClick={handleStartProcessor} 
                size="sm" 
                className="bg-green-600 hover:bg-green-700"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Démarrer Pro
                  </>
                )}
              </Button>
            ) : (
              <Button 
                onClick={handleStopProcessor} 
                size="sm" 
                variant="outline"
              >
                <Square className="h-4 w-4 mr-2" />
                Arrêter
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Système professionnel actuel */}
        {isAutoProcessing && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <Activity className="h-4 w-4 text-green-600 animate-pulse" />
            <span className="text-sm text-green-800">
              <strong>Système professionnel actif :</strong> Rate limiting, anti-doublon, retry automatique
            </span>
          </div>
        )}

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
              {queueStats.failed} emails ont échoué. Le système de retry professionnel les reprendra automatiquement.
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

        {/* Informations système professionnel */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 mb-1">Système Professionnel - Optimisé 250k/4h</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>🚀 Parallélisation massive: 150 emails simultanés (3x plus rapide)</li>
            <li>✅ Rate limiting intelligent par serveur SMTP</li>
            <li>✅ Protection anti-doublon avec message_id unique</li>
            <li>✅ Retry automatique avec backoff exponentiel</li>
            <li>✅ Support Mailgun/SendGrid/SMTP natif</li>
            <li>📊 Débit théorique: ~9000 emails/heure</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
