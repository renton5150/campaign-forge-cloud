
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
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setServers([]);
        return;
      }

      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single();

      if (!userProfile) {
        toast({
          title: "Erreur",
          description: "Impossible de récupérer le profil utilisateur.",
          variant: "destructive",
        });
        return;
      }

      let query = supabase.from('smtp_servers').select('*');
      
      if (userProfile.role !== 'super_admin') {
        query = query.eq('tenant_id', userProfile.tenant_id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading SMTP servers:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les serveurs d'envoi.",
          variant: "destructive",
        });
        return;
      }

      setServers(data || []);
    } catch (error) {
      console.error('Error in loadServers:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des serveurs.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createServer = async (serverData: SmtpServerFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour créer un serveur.",
          variant: "destructive",
        });
        return null;
      }

      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single();

      if (!userProfile) {
        toast({
          title: "Erreur",
          description: "Impossible de récupérer le profil utilisateur.",
          variant: "destructive",
        });
        return null;
      }

      let tenantId = userProfile.tenant_id;
      
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
      // Préparer les données à mettre à jour, en excluant le mot de passe s'il est vide
      const updateData: any = {
        name: serverData.name,
        type: serverData.type,
        host: serverData.host || null,
        port: serverData.port || null,
        username: serverData.username || null,
        api_key: serverData.api_key || null,
        domain: serverData.domain || null,
        region: serverData.region || null,
        encryption: serverData.encryption || 'none',
        from_name: serverData.from_name,
        from_email: serverData.from_email,
        is_active: serverData.is_active,
      };
      
      // Ne mettre à jour le mot de passe que s'il a été saisi
      if (serverData.password && serverData.password.trim() !== '') {
        updateData.password = serverData.password;
      }
      
      const { data, error } = await supabase
        .from('smtp_servers')
        .update(updateData)
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
