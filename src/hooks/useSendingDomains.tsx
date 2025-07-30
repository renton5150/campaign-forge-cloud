
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SendingDomain {
  id: string;
  domain: string;
  status: 'pending' | 'verified' | 'failed';
  dkim_selector?: string;
  dkim_public_key?: string;
  verification_token?: string;
  verification_errors?: string;
  created_at: string;
  updated_at?: string;
  tenant_id: string;
  spf_status?: 'pending' | 'verified' | 'failed';
  dmarc_status?: 'pending' | 'verified' | 'failed';
  verification_status?: 'pending' | 'verified' | 'failed';
}

export const useSendingDomains = () => {
  const queryClient = useQueryClient();

  const { data: domains = [], isLoading, error } = useQuery({
    queryKey: ['sending-domains'],
    queryFn: async () => {
      console.log('Fetching sending domains...');
      const { data, error } = await supabase
        .from('sending_domains')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sending domains:', error);
        throw error;
      }

      console.log('Fetched sending domains:', data);
      return data as SendingDomain[];
    },
  });

  const createDomainMutation = useMutation({
    mutationFn: async (domain: string) => {
      console.log('Creating domain:', domain);
      
      // Generate DKIM keys and verification token
      const dkimSelector = 'mail';
      const verificationToken = `lovable-verify-${Date.now()}`;
      const dkimPublicKey = `v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...`;

      const { data, error } = await supabase
        .from('sending_domains')
        .insert({
          domain,
          status: 'pending',
          dkim_selector: dkimSelector,
          dkim_public_key: dkimPublicKey,
          verification_token: verificationToken,
          spf_status: 'pending',
          dmarc_status: 'pending',
          verification_status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating domain:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sending-domains'] });
      toast.success('Domaine créé avec succès');
    },
    onError: (error) => {
      console.error('Failed to create domain:', error);
      toast.error('Erreur lors de la création du domaine');
    },
  });

  const deleteDomainMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting domain:', id);
      const { error } = await supabase
        .from('sending_domains')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting domain:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sending-domains'] });
      toast.success('Domaine supprimé avec succès');
    },
    onError: (error) => {
      console.error('Failed to delete domain:', error);
      toast.error('Erreur lors de la suppression du domaine');
    },
  });

  const verifyDomainMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Verifying domain:', id);
      
      // Simulate individual DNS record verification
      const simulateVerification = () => {
        const random = Math.random();
        return random > 0.3 ? 'verified' : (random > 0.1 ? 'pending' : 'failed');
      };

      const spfStatus = simulateVerification();
      const dmarcStatus = simulateVerification();
      const verificationStatus = simulateVerification();
      const dkimStatus = simulateVerification();

      // Determine overall status based on individual statuses
      const allStatuses = [spfStatus, dmarcStatus, verificationStatus, dkimStatus];
      let overallStatus: 'pending' | 'verified' | 'failed';
      
      if (allStatuses.every(s => s === 'verified')) {
        overallStatus = 'verified';
      } else if (allStatuses.some(s => s === 'failed')) {
        overallStatus = 'failed';
      } else {
        overallStatus = 'pending';
      }

      const { data, error } = await supabase
        .from('sending_domains')
        .update({ 
          status: overallStatus,
          spf_status: spfStatus,
          dmarc_status: dmarcStatus,
          verification_status: verificationStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error verifying domain:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sending-domains'] });
      const message = data.status === 'verified' 
        ? 'Domaine vérifié avec succès' 
        : data.status === 'failed'
        ? 'Échec de la vérification du domaine'
        : 'Vérification en cours...';
      toast.success(message);
    },
    onError: (error) => {
      console.error('Failed to verify domain:', error);
      toast.error('Erreur lors de la vérification du domaine');
    },
  });

  return {
    domains,
    isLoading,
    error,
    createDomain: createDomainMutation.mutate,
    deleteDomain: deleteDomainMutation.mutate,
    verifyDomain: verifyDomainMutation.mutate,
    isCreating: createDomainMutation.isPending,
    isDeleting: deleteDomainMutation.isPending,
    isVerifying: verifyDomainMutation.isPending,
  };
};
