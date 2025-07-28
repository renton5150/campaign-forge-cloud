
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

      const { data, error } = await supabase
        .from('unsubscriptions')
        .select(`
          *,
          campaigns:campaign_id (
            name,
            subject
          )
        `)
        .eq('tenant_id', user.tenant_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as UnsubscriptionRecord[];
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
