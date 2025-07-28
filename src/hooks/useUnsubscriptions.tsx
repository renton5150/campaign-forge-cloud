
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface UnsubscriptionRecord {
  id: string;
  tenant_id: string;
  email: string;
  campaign_id?: string;
  unsubscribe_token: string;
  reason?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  campaigns?: {
    name: string;
    subject: string;
  };
}

export function useUnsubscriptions() {
  const { user } = useAuth();

  // Récupérer les désabonnements du tenant
  const { data: unsubscriptions, isLoading } = useQuery({
    queryKey: ['unsubscriptions', user?.tenant_id],
    queryFn: async () => {
      if (!user?.tenant_id) {
        throw new Error('Utilisateur non authentifié');
      }

      console.log('Fetching unsubscriptions for tenant:', user.tenant_id);

      // Utiliser une requête directe sans jointure pour éviter les problèmes de types
      const { data: unsubscriptionData, error } = await supabase
        .from('unsubscriptions' as any)
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching unsubscriptions:', error);
        throw error;
      }

      // Récupérer les informations des campagnes séparément si nécessaire
      const unsubscriptionsWithCampaigns = await Promise.all(
        (unsubscriptionData || []).map(async (unsub: any) => {
          if (unsub.campaign_id) {
            const { data: campaignData } = await supabase
              .from('campaigns')
              .select('name, subject')
              .eq('id', unsub.campaign_id)
              .single();

            return {
              ...unsub,
              campaigns: campaignData
            };
          }
          return unsub;
        })
      );

      return unsubscriptionsWithCampaigns as UnsubscriptionRecord[];
    },
    enabled: !!user?.tenant_id,
  });

  // Statistiques des désabonnements
  const getUnsubscriptionStats = () => {
    if (!unsubscriptions) return null;

    const total = unsubscriptions.length;
    const today = new Date().toISOString().split('T')[0];
    const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thisMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const todayCount = unsubscriptions.filter(u => 
      u.created_at.startsWith(today)
    ).length;

    const weekCount = unsubscriptions.filter(u => 
      u.created_at >= thisWeek
    ).length;

    const monthCount = unsubscriptions.filter(u => 
      u.created_at >= thisMonth
    ).length;

    // Répartition par raison
    const reasonStats = unsubscriptions.reduce((acc, u) => {
      const reason = u.reason || 'Non spécifié';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      today: todayCount,
      week: weekCount,
      month: monthCount,
      reasonStats
    };
  };

  return {
    unsubscriptions: unsubscriptions || [],
    isLoading,
    stats: getUnsubscriptionStats(),
  };
}
