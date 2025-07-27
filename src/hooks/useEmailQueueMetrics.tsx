
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface EmailQueueMetrics {
  totalPending: number;
  totalProcessing: number;
  totalSent: number;
  totalFailed: number;
  throughputPerHour: number;
  avgProcessingTime: number;
  errorRate: number;
  lastProcessedAt: string | null;
}

export interface SmtpServerMetrics {
  serverId: string;
  serverName: string;
  totalSent: number;
  totalFailed: number;
  successRate: number;
  avgResponseTime: number;
  isHealthy: boolean;
  lastUsed: string | null;
}

export function useEmailQueueMetrics(campaignId?: string) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<EmailQueueMetrics | null>(null);
  const [smtpMetrics, setSmtpMetrics] = useState<SmtpServerMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMetrics = async () => {
    if (!user) return;

    try {
      // Construire la requête de base
      let query = supabase
        .from('email_queue')
        .select(`
          *,
          campaigns!inner(tenant_id)
        `)
        .eq('campaigns.tenant_id', user.tenant_id);

      // Filtrer par campagne si spécifié
      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }

      const { data: queueData, error } = await query;

      if (error) {
        console.error('Erreur lors du chargement des métriques:', error);
        return;
      }

      // Calculer les métriques
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const pending = queueData.filter(item => item.status === 'pending').length;
      const processing = queueData.filter(item => item.status === 'processing').length;
      const sent = queueData.filter(item => item.status === 'sent').length;
      const failed = queueData.filter(item => item.status === 'failed').length;

      // Calculer le débit par heure
      const sentLastHour = queueData.filter(item => 
        item.status === 'sent' && 
        item.sent_at && 
        new Date(item.sent_at) > oneHourAgo
      ).length;

      // Calculer le taux d'erreur
      const totalProcessed = sent + failed;
      const errorRate = totalProcessed > 0 ? (failed / totalProcessed) * 100 : 0;

      // Trouver le dernier email traité
      const lastProcessed = queueData
        .filter(item => item.sent_at)
        .sort((a, b) => new Date(b.sent_at!).getTime() - new Date(a.sent_at!).getTime())[0];

      const newMetrics: EmailQueueMetrics = {
        totalPending: pending,
        totalProcessing: processing,
        totalSent: sent,
        totalFailed: failed,
        throughputPerHour: sentLastHour,
        avgProcessingTime: 0, // À calculer si on a des timestamps détaillés
        errorRate: errorRate,
        lastProcessedAt: lastProcessed?.sent_at || null
      };

      setMetrics(newMetrics);

    } catch (error) {
      console.error('Erreur lors du calcul des métriques:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSmtpMetrics = async () => {
    if (!user) return;

    try {
      // Récupérer les serveurs SMTP
      const { data: smtpServers, error: smtpError } = await supabase
        .from('smtp_servers')
        .select('*')
        .eq('tenant_id', user.tenant_id);

      if (smtpError) {
        console.error('Erreur lors du chargement des serveurs SMTP:', smtpError);
        return;
      }

      // Récupérer les logs d'emails pour chaque serveur
      const { data: emailLogs, error: logsError } = await supabase
        .from('email_logs')
        .select(`
          *,
          email_queue!inner(
            campaign_id,
            campaigns!inner(tenant_id)
          )
        `)
        .eq('email_queue.campaigns.tenant_id', user.tenant_id)
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (logsError) {
        console.error('Erreur lors du chargement des logs:', logsError);
        return;
      }

      // Calculer les métriques par serveur
      const serverMetrics: SmtpServerMetrics[] = smtpServers.map(server => {
        const serverLogs = emailLogs.filter(log => 
          log.message?.includes(`[${server.id}]`)
        );

        const sentLogs = serverLogs.filter(log => log.status === 'sent');
        const failedLogs = serverLogs.filter(log => log.status === 'failed');
        const total = sentLogs.length + failedLogs.length;

        return {
          serverId: server.id,
          serverName: server.name,
          totalSent: sentLogs.length,
          totalFailed: failedLogs.length,
          successRate: total > 0 ? (sentLogs.length / total) * 100 : 0,
          avgResponseTime: 0, // À calculer si on a des métriques de timing
          isHealthy: total === 0 || (sentLogs.length / total) > 0.8,
          lastUsed: serverLogs.length > 0 ? 
            serverLogs.sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())[0].timestamp : null
        };
      });

      setSmtpMetrics(serverMetrics);

    } catch (error) {
      console.error('Erreur lors du calcul des métriques SMTP:', error);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchSmtpMetrics();

    // Rafraîchir les métriques toutes les 30 secondes
    const interval = setInterval(() => {
      fetchMetrics();
      fetchSmtpMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, [user, campaignId]);

  return {
    metrics,
    smtpMetrics,
    isLoading,
    refresh: () => {
      fetchMetrics();
      fetchSmtpMetrics();
    }
  };
}
