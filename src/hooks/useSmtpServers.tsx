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
      const { data, error } = await supabase
        .from('smtp_servers')
        .insert({
          ...serverData,
          tenant_id: (await supabase.auth.getUser()).data.user?.id || ''
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