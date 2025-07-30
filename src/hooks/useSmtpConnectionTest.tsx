
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ConnectionTestResult {
  success: boolean;
  message?: string;
  details?: any;
  error?: string;
}

export interface SmtpTestConfig {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  from_email?: string;
  from_name?: string;
  test_email?: string;
  encryption?: string;
}

export const useSmtpConnectionTest = () => {
  const [testing, setTesting] = useState(false);
  const [lastTest, setLastTest] = useState<ConnectionTestResult | null>(null);
  const { toast } = useToast();

  const testConnection = async (serverData: SmtpTestConfig, sendRealEmail: boolean = true) => {
    setTesting(true);
    setLastTest(null);
    
    try {
      console.log('🔍 Démarrage du test de connexion SMTP...', { sendRealEmail });
      
      const { data, error } = await supabase.functions.invoke('send-test-email', {
        body: {
          smtp_host: serverData.host,
          smtp_port: serverData.port,
          smtp_username: serverData.username,
          smtp_password: serverData.password,
          from_email: serverData.from_email,
          from_name: serverData.from_name,
          test_email: sendRealEmail ? serverData.test_email : 'test@example.com',
          send_real_email: sendRealEmail
        }
      });

      if (error) {
        console.error('❌ Erreur lors du test:', error);
        throw new Error(error.message || 'Erreur de connexion');
      }

      const testResult: ConnectionTestResult = {
        success: data.success,
        message: data.message,
        details: data.details,
        error: data.success ? undefined : data.error
      };
      
      setLastTest(testResult);
      
      if (data.success) {
        const message = sendRealEmail 
          ? `Email de test envoyé avec succès à ${serverData.test_email}`
          : data.message;
        
        toast({
          title: "✅ Test de connexion réussi",
          description: message,
        });
      } else {
        toast({
          title: "❌ Test de connexion échoué",
          description: data.error || data.details,
          variant: "destructive",
        });
      }
      
      return testResult;
      
    } catch (error) {
      console.error('❌ Erreur lors du test de connexion:', error);
      
      const testResult: ConnectionTestResult = {
        success: false,
        error: error.message || 'Erreur inconnue'
      };
      
      setLastTest(testResult);
      
      toast({
        title: "❌ Erreur de test",
        description: error.message || 'Erreur lors du test de connexion',
        variant: "destructive",
      });
      
      return testResult;
      
    } finally {
      setTesting(false);
    }
  };

  return {
    testConnection,
    testing,
    lastTest,
  };
};
