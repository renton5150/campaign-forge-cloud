
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
    console.log('🔍 Début du test de connexion SMTP...', { 
      serverData: { 
        host: serverData.host, 
        port: serverData.port, 
        username: serverData.username,
        from_email: serverData.from_email,
        test_email: serverData.test_email
      }, 
      sendRealEmail 
    });
    
    setTesting(true);
    setLastTest(null);
    
    // Timeout côté client après 30 secondes
    const timeoutId = setTimeout(() => {
      console.error('⏰ Timeout du test SMTP côté client (30s)');
      setTesting(false);
      const timeoutResult: ConnectionTestResult = {
        success: false,
        error: 'Timeout du test - le serveur met trop de temps à répondre'
      };
      setLastTest(timeoutResult);
      
      toast({
        title: "⏰ Timeout du test",
        description: "Le test a pris trop de temps. Vérifiez votre configuration SMTP.",
        variant: "destructive",
      });
    }, 30000);
    
    try {
      console.log('📤 Appel de la fonction Edge send-test-email...');
      
      const requestBody = {
        smtp_host: serverData.host,
        smtp_port: serverData.port,
        smtp_username: serverData.username,
        smtp_password: serverData.password,
        from_email: serverData.from_email,
        from_name: serverData.from_name,
        test_email: sendRealEmail ? serverData.test_email : 'test@example.com',
        send_real_email: sendRealEmail
      };
      
      console.log('📤 Corps de la requête:', requestBody);

      const { data, error } = await supabase.functions.invoke('send-test-email', {
        body: requestBody
      });

      clearTimeout(timeoutId);
      
      console.log('📥 Réponse brute de la fonction Edge:', { data, error });

      if (error) {
        console.error('❌ Erreur lors de l\'invocation de la fonction:', error);
        throw new Error(error.message || 'Erreur de connexion à la fonction Edge');
      }

      // Vérifier que data existe et a la structure attendue
      if (!data || typeof data !== 'object') {
        console.error('❌ Réponse invalide de la fonction Edge:', data);
        throw new Error('Réponse invalide de la fonction Edge');
      }

      const testResult: ConnectionTestResult = {
        success: data.success || false,
        message: data.message,
        details: data.details,
        error: data.success ? undefined : (data.error || data.details)
      };
      
      console.log('✅ Résultat du test traité:', testResult);
      setLastTest(testResult);
      
      if (data.success) {
        const message = sendRealEmail 
          ? `Email de test envoyé avec succès à ${serverData.test_email}`
          : (data.message || 'Test de connexion réussi');
        
        toast({
          title: "✅ Test de connexion réussi",
          description: message,
        });
      } else {
        const errorMsg = data.error || data.details || 'Erreur inconnue';
        toast({
          title: "❌ Test de connexion échoué",
          description: errorMsg,
          variant: "destructive",
        });
      }
      
      return testResult;
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('❌ Erreur lors du test de connexion:', error);
      
      const testResult: ConnectionTestResult = {
        success: false,
        error: error.message || 'Erreur inconnue lors du test'
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
