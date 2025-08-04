
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ConnectionTestResult {
  success: boolean;
  message?: string;
  details?: any;
  error?: string;
  responseTime?: number;
  suggestions?: string[];
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
    console.log('🔍 [CLIENT] Début du test de connexion SMTP...', { 
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
    
    try {
      console.log('📤 [CLIENT] Appel de la fonction Edge process-email-queue en mode test...');
      
      const requestBody = {
        test_mode: true,
        test_server: {
          host: serverData.host,
          port: serverData.port,
          username: serverData.username,
          password: serverData.password,
          from_email: serverData.from_email,
          from_name: serverData.from_name,
          encryption: serverData.encryption || 'tls'
        },
        test_email: sendRealEmail ? serverData.test_email : 'test@example.com',
        send_real_email: sendRealEmail
      };
      
      console.log('📤 [CLIENT] Corps de la requête:', { 
        ...requestBody, 
        test_server: { 
          ...requestBody.test_server, 
          password: '***' 
        } 
      });

      // Timeout côté client de 120 secondes pour les serveurs lents
      const clientTimeout = setTimeout(() => {
        throw new Error('Timeout côté client après 120 secondes');
      }, 120000);

      const response = await supabase.functions.invoke('process-email-queue', {
        body: requestBody
      });

      clearTimeout(clientTimeout);
      
      console.log('📥 [CLIENT] Réponse brute complète:', response);

      // Vérifier les erreurs de transport
      if (response.error) {
        console.error('❌ [CLIENT] Erreur de transport:', response.error);
        throw new Error(`Erreur de transport: ${response.error.message || response.error}`);
      }

      // Vérifier que data existe
      if (!response.data) {
        console.error('❌ [CLIENT] Pas de data dans la réponse');
        throw new Error('Réponse vide de la fonction Edge');
      }

      const data = response.data;
      console.log('📊 [CLIENT] Data traitée:', data);

      const testResult: ConnectionTestResult = {
        success: data.success === true,
        message: data.message,
        details: data.details,
        error: data.success !== true ? (data.error || data.details || 'Erreur inconnue') : undefined,
        responseTime: data.responseTime || undefined,
        suggestions: data.suggestions || undefined
      };
      
      console.log('✅ [CLIENT] Résultat du test final:', testResult);
      setLastTest(testResult);
      
      if (testResult.success) {
        const message = sendRealEmail 
          ? `Email de test envoyé avec succès à ${serverData.test_email} (${testResult.responseTime || 0}ms)`
          : `Test de connectivité réussi (${testResult.responseTime || 0}ms)`;
        
        toast({
          title: "✅ Test de connexion réussi",
          description: message,
        });
      } else {
        const errorMsg = testResult.error || 'Erreur inconnue';
        const timeInfo = testResult.responseTime ? ` (${testResult.responseTime}ms)` : '';
        
        toast({
          title: "❌ Test de connexion échoué",
          description: errorMsg + timeInfo,
          variant: "destructive",
        });
      }
      
      return testResult;
      
    } catch (error: any) {
      console.error('❌ [CLIENT] Erreur lors du test de connexion:', error);
      
      const testResult: ConnectionTestResult = {
        success: false,
        error: error.message || 'Erreur inconnue lors du test',
        responseTime: 0
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
