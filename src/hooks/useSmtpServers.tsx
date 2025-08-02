import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';

export type SmtpServer = Tables<'smtp_servers'>;

export type SmtpServerType = 'smtp' | 'sendgrid' | 'mailgun' | 'amazon_ses';

export interface SmtpServerFormData {
  name: string;
  type: SmtpServerType;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  api_key?: string;
  domain?: string;
  region?: string;
  encryption?: string;
  from_name: string;
  from_email: string;
  is_active: boolean;
}

export const useSmtpServers = () => {
  const [servers, setServers] = useState<SmtpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadServers = async () => {
    try {
      console.log('🔍 [DEBUG] Début du chargement des serveurs SMTP...');
      
      // Vérifier l'authentification
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('🔍 [DEBUG] Utilisateur authentifié:', user?.id, userError);
      
      if (userError || !user) {
        console.error('❌ [DEBUG] Utilisateur non authentifié:', userError);
        setServers([]);
        setLoading(false);
        return;
      }

      // Récupérer le profil utilisateur pour le tenant_id et role
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single();
      
      console.log('🔍 [DEBUG] Profil utilisateur:', userProfile, profileError);

      if (profileError) {
        console.error('❌ [DEBUG] Erreur profil utilisateur:', profileError);
        toast({
          title: "Erreur",
          description: "Impossible de récupérer le profil utilisateur.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Tentative 1: Récupération avec filtrage par tenant (si pas super_admin)
      let query = supabase.from('smtp_servers').select('*');
      
      if (userProfile?.role !== 'super_admin') {
        console.log('🔍 [DEBUG] Utilisateur normal, filtrage par tenant_id:', userProfile?.tenant_id);
        query = query.eq('tenant_id', userProfile?.tenant_id);
      } else {
        console.log('🔍 [DEBUG] Super admin, récupération de tous les serveurs');
      }

      const { data: servers1, error: error1 } = await query.order('created_at', { ascending: false });
      
      console.log('🔍 [DEBUG] Résultat requête 1 (avec filtrage):', {
        servers: servers1,
        error: error1,
        count: servers1?.length || 0
      });

      if (error1) {
        console.error('❌ [DEBUG] Erreur requête 1:', error1);
        
        // Tentative 2: Récupération sans filtrage pour diagnostiquer
        console.log('🔍 [DEBUG] Tentative 2: récupération sans filtrage...');
        const { data: serversAll, error: errorAll } = await supabase
          .from('smtp_servers')
          .select('*')
          .order('created_at', { ascending: false });
        
        console.log('🔍 [DEBUG] Résultat requête 2 (sans filtrage):', {
          servers: serversAll,
          error: errorAll,
          count: serversAll?.length || 0
        });

        if (serversAll && serversAll.length > 0) {
          console.log('🔍 [DEBUG] Serveurs trouvés sans filtrage, problème de RLS détecté');
          toast({
            title: "Problème de permissions détecté",
            description: `${serversAll.length} serveur(s) trouvé(s) mais non accessible(s). Problème de sécurité RLS.`,
            variant: "destructive",
          });
        }

        toast({
          title: "Erreur",
          description: "Impossible de charger les serveurs d'envoi: " + error1.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      console.log('✅ [DEBUG] Serveurs chargés avec succès:', servers1?.length || 0);
      setServers(servers1 || []);
    } catch (error) {
      console.error('💥 [DEBUG] Erreur dans loadServers:', error);
      toast({
        title: "Erreur",
        description: "Erreur inattendue lors du chargement des serveurs.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createServer = async (serverData: SmtpServerFormData) => {
    try {
      console.log('🔍 [DEBUG] Création serveur SMTP:', serverData);
      
      // Récupérer l'utilisateur authentifié
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('User not authenticated:', userError);
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour créer un serveur.",
          variant: "destructive",
        });
        return null;
      }

      // Récupérer le profil utilisateur
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single();

      if (profileError || !userProfile) {
        console.error('Error fetching user profile:', profileError);
        toast({
          title: "Erreur",
          description: "Impossible de récupérer le profil utilisateur.",
          variant: "destructive",
        });
        return null;
      }

      // Déterminer le tenant_id à utiliser
      let tenantId = userProfile.tenant_id;
      
      // Si l'utilisateur est super_admin et n'a pas de tenant_id, utiliser son ID
      if (!tenantId && userProfile.role === 'super_admin') {
        tenantId = user.id;
      }

      if (!tenantId) {
        toast({
          title: "Erreur",
          description: "Aucun tenant associé à votre compte.",
          variant: "destructive",
        });
        return null;
      }

      console.log('Creating SMTP server with data:', {
        ...serverData,
        tenant_id: tenantId,
        encryption: serverData.encryption || 'none'
      });

      // Créer le serveur SMTP avec seulement les colonnes existantes
      const { data, error } = await supabase
        .from('smtp_servers')
        .insert({
          name: serverData.name,
          type: serverData.type,
          host: serverData.host || null,
          port: serverData.port || null,
          username: serverData.username || null,
          password: serverData.password || null,
          api_key: serverData.api_key || null,
          domain: serverData.domain || null,
          region: serverData.region || null,
          encryption: serverData.encryption || 'none',
          from_name: serverData.from_name,
          from_email: serverData.from_email,
          is_active: serverData.is_active,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating SMTP server:', error);
        toast({
          title: "Erreur",
          description: "Impossible de créer le serveur d'envoi.",
          variant: "destructive",
        });
        return null;
      }

      toast({
        title: "Serveur créé",
        description: "Le serveur d'envoi a été créé avec succès.",
      });

      await loadServers();
      return data;
    } catch (error) {
      console.error('Error creating SMTP server:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le serveur d'envoi.",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateServer = async (id: string, serverData: SmtpServerFormData) => {
    try {
      console.log('Updating SMTP server with data:', {
        ...serverData,
        encryption: serverData.encryption || 'none'
      });

      // Mettre à jour avec seulement les colonnes existantes
      const { data, error } = await supabase
        .from('smtp_servers')
        .update({
          name: serverData.name,
          type: serverData.type,
          host: serverData.host || null,
          port: serverData.port || null,
          username: serverData.username || null,
          password: serverData.password || null,
          api_key: serverData.api_key || null,
          domain: serverData.domain || null,
          region: serverData.region || null,
          encryption: serverData.encryption || 'none',
          from_name: serverData.from_name,
          from_email: serverData.from_email,
          is_active: serverData.is_active,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating SMTP server:', error);
        toast({
          title: "Erreur",
          description: "Impossible de modifier le serveur d'envoi.",
          variant: "destructive",
        });
        return null;
      }

      toast({
        title: "Serveur modifié",
        description: "Le serveur d'envoi a été modifié avec succès.",
      });

      await loadServers();
      return data;
    } catch (error) {
      console.error('Error updating SMTP server:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le serveur d'envoi.",
        variant: "destructive",
      });
      return null;
    }
  };

  const testSmtpConnection = async (serverData: SmtpServerFormData) => {
    try {
      console.log('Testing SMTP connection with data:', {
        ...serverData,
        encryption: serverData.encryption || 'none'
      });

      const { data, error } = await supabase.functions.invoke('test-smtp-connection', {
        body: {
          type: serverData.type,
          host: serverData.host,
          port: serverData.port,
          username: serverData.username,
          password: serverData.password,
          api_key: serverData.api_key,
          domain: serverData.domain,
          region: serverData.region,
          encryption: serverData.encryption || 'none'
        }
      });

      if (error) {
        console.error('Error testing SMTP connection:', error);
        throw new Error(error.message || 'Erreur lors du test de connexion');
      }

      if (!data.success) {
        throw new Error(data.error || 'Test de connexion échoué');
      }

      return {
        success: true,
        message: data.message,
        details: data.details
      };

    } catch (error) {
      console.error('Error in testSmtpConnection:', error);
      throw error;
    }
  };

  const deleteServer = async (id: string) => {
    try {
      const { error } = await supabase
        .from('smtp_servers')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting SMTP server:', error);
        toast({
          title: "Erreur",
          description: "Impossible de supprimer le serveur d'envoi.",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Serveur supprimé",
        description: "Le serveur d'envoi a été supprimé avec succès.",
      });

      await loadServers();
      return true;
    } catch (error) {
      console.error('Error deleting SMTP server:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le serveur d'envoi.",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    loadServers();
  }, []);

  return {
    servers,
    loading,
    createServer,
    updateServer,
    deleteServer,
    testSmtpConnection,
    refetch: loadServers,
  };
};
