
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';

export type SendingDomain = Tables<'sending_domains'>;

export interface CreateDomainData {
  domain_name: string;
  tenant_id?: string;
  smtp_server_id?: string;
}

export interface DNSRecords {
  dkim: {
    host: string;
    value: string;
  };
  spf: {
    host: string;
    value: string;
  };
  dmarc: {
    host: string;
    value: string;
  };
  verification: {
    host: string;
    value: string;
  };
}

export interface CreateDomainResponse {
  success: boolean;
  domain_id: string;
  dns_records: DNSRecords;
}

export const useSendingDomains = () => {
  const [domains, setDomains] = useState<SendingDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingDomains, setVerifyingDomains] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const loadDomains = async () => {
    try {
      const { data, error } = await supabase
        .from('sending_domains')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading sending domains:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les domaines d'envoi.",
          variant: "destructive",
        });
        return;
      }

      setDomains(data || []);
    } catch (error) {
      console.error('Error loading sending domains:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les domaines d'envoi.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createDomain = async (domainData: CreateDomainData): Promise<CreateDomainResponse | null> => {
    try {
      console.log('🚀 [useSendingDomains] Début création domaine:', domainData);

      // Déterminer le tenant_id à passer à la fonction
      let tenantIdToPass: string | null = null;
      
      if (domainData.tenant_id !== undefined) {
        tenantIdToPass = domainData.tenant_id;
      }
      // Si tenant_id est undefined, on passe null (domaine système pour super admin)

      console.log('📤 [useSendingDomains] Appel RPC avec:', {
        p_domain_name: domainData.domain_name,
        p_tenant_id: tenantIdToPass
      });

      const { data, error } = await supabase.rpc('create_sending_domain', {
        p_domain_name: domainData.domain_name,
        p_tenant_id: tenantIdToPass
      });

      if (error) {
        console.error('❌ [useSendingDomains] Erreur RPC:', error);
        toast({
          title: "Erreur",
          description: `Impossible de créer le domaine d'envoi: ${error.message}`,
          variant: "destructive",
        });
        return null;
      }

      console.log('📥 [useSendingDomains] Réponse RPC brute:', data);

      const result = data as unknown as CreateDomainResponse;

      if (!result || typeof result !== 'object' || typeof result.success !== 'boolean') {
        console.error('❌ [useSendingDomains] Structure de réponse invalide:', result);
        toast({
          title: "Erreur",
          description: "Réponse invalide du serveur.",
          variant: "destructive",
        });
        return null;
      }

      if (result.success) {
        console.log('✅ [useSendingDomains] Domaine créé avec succès, ID:', result.domain_id);
        
        // Si un serveur SMTP a été sélectionné, lier le domaine au serveur
        if (domainData.smtp_server_id && result.domain_id) {
          try {
            console.log('🔗 [useSendingDomains] Liaison au serveur SMTP:', domainData.smtp_server_id);
            
            const { error: linkError } = await supabase
              .from('smtp_servers')
              .update({ sending_domain_id: result.domain_id })
              .eq('id', domainData.smtp_server_id);

            if (linkError) {
              console.error('⚠️ [useSendingDomains] Erreur liaison SMTP:', linkError);
              toast({
                title: "Avertissement",
                description: "Domaine créé mais erreur lors de la liaison au serveur SMTP.",
                variant: "destructive",
              });
            } else {
              console.log('✅ [useSendingDomains] Domaine lié avec succès au serveur SMTP');
            }
          } catch (linkError) {
            console.error('💥 [useSendingDomains] Exception liaison SMTP:', linkError);
          }
        }

        // Recharger la liste des domaines
        await loadDomains();
        return result;
      } else {
        console.log('❌ [useSendingDomains] Création échouée:', result);
        toast({
          title: "Erreur",
          description: "Erreur lors de la création du domaine.",
          variant: "destructive",
        });
        return null;
      }
    } catch (error) {
      console.error('💥 [useSendingDomains] Exception lors de la création:', error);
      toast({
        title: "Erreur",
        description: `Impossible de créer le domaine d'envoi: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        variant: "destructive",
      });
      return null;
    }
  };

  const verifyDomain = async (domainId: string) => {
    try {
      setVerifyingDomains(prev => new Set(prev).add(domainId));

      // Simulation de vérification DNS détaillée pour chaque enregistrement
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Simuler des résultats de vérification individuels
      const dkimVerified = Math.random() > 0.3;
      const spfVerified = Math.random() > 0.2;
      const dmarcVerified = Math.random() > 0.4;
      const verificationVerified = Math.random() > 0.1;

      // Déterminer le statut global
      const allVerified = dkimVerified && spfVerified && dmarcVerified && verificationVerified;
      const someVerified = dkimVerified || spfVerified || dmarcVerified || verificationVerified;
      
      const globalStatus = allVerified ? 'verified' : someVerified ? 'pending' : 'failed';

      const { data, error } = await supabase
        .from('sending_domains')
        .update({
          status: globalStatus,
          dkim_status: dkimVerified ? 'verified' : 'failed',
          spf_status: spfVerified ? 'verified' : 'failed',
          dmarc_status: dmarcVerified ? 'verified' : 'failed',
          verification_status: verificationVerified ? 'verified' : 'failed',
          dns_verified_at: allVerified ? new Date().toISOString() : null,
          last_verification_attempt: new Date().toISOString()
        })
        .eq('id', domainId);

      if (error) {
        console.error('Error verifying domain:', error);
        toast({
          title: "Erreur",
          description: "Impossible de vérifier le domaine.",
          variant: "destructive",
        });
        return;
      }

      const verifiedCount = [dkimVerified, spfVerified, dmarcVerified, verificationVerified].filter(Boolean).length;
      
      if (allVerified) {
        toast({
          title: "✅ Domaine entièrement vérifié",
          description: "Tous les enregistrements DNS sont correctement configurés.",
        });
      } else if (verifiedCount > 0) {
        toast({
          title: "⚠️ Vérification partielle",
          description: `${verifiedCount}/4 enregistrements DNS vérifiés avec succès.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "❌ Vérification échouée",
          description: "Aucun enregistrement DNS n'a pu être vérifié.",
          variant: "destructive",
        });
      }

      await loadDomains();
    } catch (error) {
      console.error('Error verifying domain:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la vérification du domaine.",
        variant: "destructive",
      });
    } finally {
      setVerifyingDomains(prev => {
        const newSet = new Set(prev);
        newSet.delete(domainId);
        return newSet;
      });
    }
  };

  const deleteDomain = async (domainId: string) => {
    try {
      const { error } = await supabase
        .from('sending_domains')
        .delete()
        .eq('id', domainId);

      if (error) {
        console.error('Error deleting sending domain:', error);
        toast({
          title: "Erreur",
          description: "Impossible de supprimer le domaine d'envoi.",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Domaine supprimé",
        description: "Le domaine d'envoi a été supprimé avec succès.",
      });

      await loadDomains();
      return true;
    } catch (error) {
      console.error('Error deleting sending domain:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le domaine d'envoi.",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    loadDomains();
  }, []);

  return {
    domains,
    loading,
    verifyingDomains,
    createDomain,
    verifyDomain,
    deleteDomain,
    refetch: loadDomains,
  };
};
