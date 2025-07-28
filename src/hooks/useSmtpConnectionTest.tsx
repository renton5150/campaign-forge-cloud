
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ConnectionTestResult {
  success: boolean;
  steps: Array<{
    step: string;
    success: boolean;
    code?: string;
    message?: string;
    analysis?: string;
    raw_response?: string;
    error?: string;
  }>;
  error?: string;
  server_config?: {
    host: string;
    port: number;
    encryption: string;
  };
}

export const useSmtpConnectionTest = () => {
  const [testing, setTesting] = useState(false);
  const [lastTest, setLastTest] = useState<ConnectionTestResult | null>(null);
  const { toast } = useToast();

  const testConnection = async (serverData: any) => {
    setTesting(true);
    setLastTest(null);
    
    try {
      console.log('🔍 Démarrage du test de connexion SMTP...');
      
      const { data, error } = await supabase.functions.invoke('send-test-email', {
        body: {
          to: 'test@example.com',
          subject: 'Test de connexion',
          html_content: '<p>Test de connexion SMTP</p>',
          from_name: 'Test',
          from_email: serverData.from_email || 'test@example.com'
        }
      });

      if (error) {
        console.error('❌ Erreur lors du test:', error);
        throw new Error(error.message || 'Erreur de connexion');
      }

      if (data && data.diagnostic) {
        const testResult: ConnectionTestResult = {
          success: data.success,
          steps: data.diagnostic.connection_test || [],
          error: data.success ? undefined : data.error,
          server_config: data.diagnostic.server_config
        };
        
        setLastTest(testResult);
        
        if (data.success) {
          toast({
            title: "✅ Test de connexion réussi",
            description: "La connexion SMTP fonctionne correctement",
          });
        } else {
          toast({
            title: "❌ Test de connexion échoué",
            description: data.analysis || data.error,
            variant: "destructive",
          });
        }
        
        return testResult;
      }

      throw new Error('Réponse inattendue du serveur');
      
    } catch (error) {
      console.error('❌ Erreur lors du test de connexion:', error);
      
      const testResult: ConnectionTestResult = {
        success: false,
        steps: [],
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
