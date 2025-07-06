
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
      const { data, error } = await supabase
        .from('smtp_servers')
        .select('*')
        .order('created_at', { ascending: false });

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
      console.error('Error loading SMTP servers:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les serveurs d'envoi.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createServer = async (serverData: SmtpServerFormData) => {
    try {
      // Récupérer l'utilisateur authentifié et son profil
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

      // Récupérer le tenant_id de l'utilisateur
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('tenant_id')
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

      // Créer le serveur SMTP avec le bon tenant_id
      const { data, error } = await supabase
        .from('smtp_servers')
        .insert({
          ...serverData,
          tenant_id: userProfile.tenant_id || user.id // Fallback sur user.id si pas de tenant_id
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
    deleteServer,
    refetch: loadServers,
  };
};
