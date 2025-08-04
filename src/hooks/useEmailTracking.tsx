import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface EmailOpen {
  id: string;
  tenant_id: string;
  email_queue_id: string;
  campaign_id: string;
  contact_email: string;
  opened_at: string;
  ip_address?: string;
  user_agent?: string;
  country?: string;
  device_type?: string;
  email_client?: string;
  created_at: string;
}

export interface EmailClick {
  id: string;
  tenant_id: string;
  email_queue_id: string;
  campaign_id: string;
  contact_email: string;
  original_url: string;
  clicked_at: string;
  ip_address?: string;
  user_agent?: string;
  country?: string;
  device_type?: string;
  created_at: string;
}

export interface Unsubscribe {
  id: string;
  tenant_id: string;
  contact_email: string;
  campaign_id?: string;
  unsubscribed_at: string;
  reason?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface CampaignTrackingStats {
  campaign_id: string;
  total_sent: number;
  unique_opens: number;
  total_opens: number;
  unique_clicks: number;
  total_clicks: number;
  unsubscribes: number;
  open_rate: number;
  click_rate: number;
  unsubscribe_rate: number;
}

export function useEmailTracking(campaignId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Récupérer les ouvertures
  const { data: opens, isLoading: opensLoading } = useQuery({
    queryKey: ['email_opens', campaignId, user?.tenant_id],
    queryFn: async () => {
      if (!campaignId) return [];

      const { data, error } = await supabase
        .from('email_opens')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('opened_at', { ascending: false });
      
      if (error) throw error;
      return data as EmailOpen[];
    },
    enabled: !!campaignId && !!user?.tenant_id,
  });

  // Récupérer les clics
  const { data: clicks, isLoading: clicksLoading } = useQuery({
    queryKey: ['email_clicks', campaignId, user?.tenant_id],
    queryFn: async () => {
      if (!campaignId) return [];

      const { data, error } = await supabase
        .from('email_clicks')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('clicked_at', { ascending: false });
      
      if (error) throw error;
      return data as EmailClick[];
    },
    enabled: !!campaignId && !!user?.tenant_id,
  });

  // Récupérer les désabonnements
  const { data: unsubscribes, isLoading: unsubscribesLoading } = useQuery({
    queryKey: ['unsubscribes', campaignId, user?.tenant_id],
    queryFn: async () => {
      if (!campaignId) return [];

      const { data, error } = await supabase
        .from('unsubscribes')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('unsubscribed_at', { ascending: false });
      
      if (error) throw error;
      return data as Unsubscribe[];
    },
    enabled: !!campaignId && !!user?.tenant_id,
  });

  // Générer un token de tracking
  const generateTrackingToken = useMutation({
    mutationFn: async ({
      emailQueueId,
      campaignId,
      contactEmail,
      tokenType,
      originalUrl
    }: {
      emailQueueId: string;
      campaignId: string;
      contactEmail: string;
      tokenType: 'open' | 'click' | 'unsubscribe';
      originalUrl?: string;
    }) => {
      if (!user?.tenant_id) throw new Error('No tenant ID');

      const { data, error } = await supabase.rpc('generate_tracking_token', {
        p_tenant_id: user.tenant_id,
        p_email_queue_id: emailQueueId,
        p_campaign_id: campaignId,
        p_contact_email: contactEmail,
        p_token_type: tokenType,
        p_original_url: originalUrl || null
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracking_tokens'] });
    },
  });

  // Calculer les statistiques de tracking
  const getTrackingStats = (totalSent: number): CampaignTrackingStats => {
    const uniqueOpens = new Set(opens?.map(o => o.contact_email) || []).size;
    const totalOpens = opens?.length || 0;
    const uniqueClicks = new Set(clicks?.map(c => c.contact_email) || []).size;
    const totalClicks = clicks?.length || 0;
    const totalUnsubscribes = unsubscribes?.length || 0;

    return {
      campaign_id: campaignId || '',
      total_sent: totalSent,
      unique_opens: uniqueOpens,
      total_opens: totalOpens,
      unique_clicks: uniqueClicks,
      total_clicks: totalClicks,
      unsubscribes: totalUnsubscribes,
      open_rate: totalSent > 0 ? (uniqueOpens / totalSent) * 100 : 0,
      click_rate: totalSent > 0 ? (uniqueClicks / totalSent) * 100 : 0,
      unsubscribe_rate: totalSent > 0 ? (totalUnsubscribes / totalSent) * 100 : 0,
    };
  };

  return {
    opens: opens || [],
    clicks: clicks || [],
    unsubscribes: unsubscribes || [],
    isLoading: opensLoading || clicksLoading || unsubscribesLoading,
    generateTrackingToken,
    getTrackingStats,
  };
}

// Hook pour la configuration tenant
export function useTenantTracking() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Récupérer la configuration du tenant
  const { data: tenantConfig, isLoading } = useQuery({
    queryKey: ['tenant_tracking_config', user?.tenant_id],
    queryFn: async () => {
      if (!user?.tenant_id) return null;

      const { data, error } = await supabase
        .from('tenants')
        .select('tracking_domain, brand_config, unsubscribe_page_config')
        .eq('id', user.tenant_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.tenant_id,
  });

  // Mettre à jour la configuration de tracking
  const updateTrackingConfig = useMutation({
    mutationFn: async (config: {
      tracking_domain?: string;
      brand_config?: any;
      unsubscribe_page_config?: any;
    }) => {
      if (!user?.tenant_id) throw new Error('No tenant ID');

      const { data, error } = await supabase
        .from('tenants')
        .update(config)
        .eq('id', user.tenant_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant_tracking_config'] });
    },
  });

  return {
    tenantConfig,
    isLoading,
    updateTrackingConfig,
  };
}