
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types locaux pour les données de domaine avec les nouveaux champs DNS
interface SendingDomainWithDNS {
  id: string;
  domain: string;
  status: string;
  created_at: string;
  dkim_status: string;
  spf_status?: string;
  dmarc_status?: string;
  verification_status?: string;
  dkim_private_key: string;
  dkim_public_key: string;
  dkim_selector: string;
  dmarc_record: string;
  spf_record: string;
  verification_token: string;
  dns_verified_at: string | null;
  tenant_id: string;
}

export interface CreateDomainData {
  domain: string;
}

export interface CreateDomainResponse {
  success: boolean;
  error?: string;
}

export interface DNSRecord {
  host: string;
  value: string;
}

export interface DNSRecords {
  dkim: DNSRecord;
  spf: DNSRecord;
  dmarc: DNSRecord;
  verification: DNSRecord;
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

      console.log('Sending domains fetched:', data);
      
      // Transformer les données pour s'assurer que tous les champs sont présents
      return (data || []).map(domain => ({
        ...domain,
        domain: domain.domain_name, // Mapper domain_name vers domain pour l'affichage
        spf_status: domain.spf_status || 'pending',
        dmarc_status: domain.dmarc_status || 'pending',
        verification_status: domain.verification_status || 'pending'
      })) as SendingDomainWithDNS[];
    },
  });

  const createDomainMutation = useMutation({
    mutationFn: async ({ domainData, smtpServerId }: { domainData: CreateDomainData; smtpServerId?: string }) => {
      console.log('Creating domain:', domainData, 'with SMTP server:', smtpServerId);
      
      // Créer le domaine
      const { data: newDomain, error: domainError } = await supabase
        .from('sending_domains')
        .insert({
          domain_name: domainData.domain,
          status: 'pending',
          dkim_status: 'pending',
          spf_status: 'pending',
          dmarc_status: 'pending',
          verification_status: 'pending'
        })
        .select()
        .single();

      if (domainError) {
        console.error('Error creating domain:', domainError);
        throw domainError;
      }

      // Si un serveur SMTP est sélectionné, le rattacher au domaine
      if (smtpServerId && newDomain) {
        console.log('Attaching SMTP server to domain...');
        const { error: smtpError } = await supabase
          .from('smtp_servers')
          .update({
            sending_domain_id: newDomain.id
          })
          .eq('id', smtpServerId);

        if (smtpError) {
          console.error('Error attaching SMTP server:', smtpError);
          // Ne pas faire échouer la création du domaine si l'attachement SMTP échoue
          toast.error('Domaine créé mais impossible de rattacher le serveur SMTP');
        } else {
          console.log('SMTP server attached successfully');
        }
      }

      return newDomain;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sending-domains'] });
      queryClient.invalidateQueries({ queryKey: ['smtp-servers'] }); // Invalider aussi les serveurs SMTP
      toast.success('Domaine créé avec succès');
    },
    onError: (error: any) => {
      console.error('Error creating domain:', error);
      toast.error('Erreur lors de la création du domaine');
    },
  });

  const verifyDomainMutation = useMutation({
    mutationFn: async (domainId: string) => {
      console.log('Verifying domain:', domainId);
      
      // Simuler une vérification DNS détaillée
      const mockResults = {
        dkim_status: Math.random() > 0.3 ? 'verified' : 'failed',
        spf_status: Math.random() > 0.2 ? 'verified' : 'failed',
        dmarc_status: Math.random() > 0.4 ? 'verified' : 'failed',
        verification_status: Math.random() > 0.1 ? 'verified' : 'failed'
      };

      // Déterminer le statut global
      const allVerified = Object.values(mockResults).every(status => status === 'verified');
      const anyFailed = Object.values(mockResults).some(status => status === 'failed');
      const globalStatus = allVerified ? 'verified' : anyFailed ? 'failed' : 'pending';

      const { data, error } = await supabase
        .from('sending_domains')
        .update({
          ...mockResults,
          status: globalStatus,
          dns_verified_at: allVerified ? new Date().toISOString() : null
        })
        .eq('id', domainId)
        .select()
        .single();

      if (error) {
        console.error('Error verifying domain:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sending-domains'] });
      toast.success('Vérification DNS effectuée');
    },
    onError: (error: any) => {
      console.error('Error verifying domain:', error);
      toast.error('Erreur lors de la vérification DNS');
    },
  });

  const deleteDomainMutation = useMutation({
    mutationFn: async (domainId: string) => {
      console.log('Deleting domain:', domainId);
      const { error } = await supabase
        .from('sending_domains')
        .delete()
        .eq('id', domainId);

      if (error) {
        console.error('Error deleting domain:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sending-domains'] });
      toast.success('Domaine supprimé avec succès');
    },
    onError: (error: any) => {
      console.error('Error deleting domain:', error);
      toast.error('Erreur lors de la suppression du domaine');
    },
  });

  return {
    domains,
    isLoading,
    error,
    createDomain: (domainData: CreateDomainData, smtpServerId?: string) => 
      createDomainMutation.mutateAsync({ domainData, smtpServerId }),
    verifyDomain: verifyDomainMutation.mutateAsync,
    deleteDomain: deleteDomainMutation.mutateAsync,
    isCreating: createDomainMutation.isPending,
    isVerifying: verifyDomainMutation.isPending,
    isDeleting: deleteDomainMutation.isPending,
  };
};
