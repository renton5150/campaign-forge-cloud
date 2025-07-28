
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface UnsubscribeToken {
  token: string;
  email: string;
  tenant_id: string;
  campaign_id?: string;
  created_at: string;
  expires_at: string;
}

export interface UnsubscribeRecord {
  id: string;
  tenant_id: string;
  email: string;
  campaign_id?: string;
  unsubscribe_token: string;
  reason?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export function useUnsubscribe() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Créer un token de désabonnement
  const createUnsubscribeToken = useMutation({
    mutationFn: async ({ email, campaign_id }: { email: string; campaign_id?: string }) => {
      if (!user?.tenant_id) {
        throw new Error('Utilisateur non authentifié ou sans tenant');
      }

      const { data, error } = await supabase.rpc('create_unsubscribe_token', {
        p_email: email,
        p_tenant_id: user.tenant_id,
        p_campaign_id: campaign_id
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unsubscribe_tokens'] });
    },
  });

  // Générer l'URL de désabonnement
  const generateUnsubscribeUrl = (token: string): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/unsubscribe/${token}`;
  };

  // Traiter un désabonnement
  const processUnsubscription = useMutation({
    mutationFn: async ({
      token,
      email,
      tenant_id,
      campaign_id,
      reason,
      ip_address,
      user_agent
    }: {
      token: string;
      email: string;
      tenant_id: string;
      campaign_id?: string;
      reason?: string;
      ip_address?: string;
      user_agent?: string;
    }) => {
      const { data, error } = await supabase.rpc('process_unsubscription', {
        p_token: token,
        p_email: email,
        p_tenant_id: tenant_id,
        p_campaign_id: campaign_id,
        p_reason: reason,
        p_ip_address: ip_address,
        p_user_agent: user_agent
      });

      if (error) throw error;
      
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors du désabonnement');
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unsubscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['blacklists'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  // Nettoyer les tokens expirés
  const cleanupExpiredTokens = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('cleanup_expired_unsubscribe_tokens');
      if (error) throw error;
      return data as number;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unsubscribe_tokens'] });
    },
  });

  return {
    createUnsubscribeToken,
    generateUnsubscribeUrl,
    processUnsubscription,
    cleanupExpiredTokens,
  };
}
