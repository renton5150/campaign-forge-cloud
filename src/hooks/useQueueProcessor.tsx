import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProcessQueueResponse {
  success: boolean;
  processed: number;
  succeeded: number;
  failed: number;
  message: string;
}

export function useQueueProcessor() {
  
  const processQueue = useMutation({
      mutationFn: async (): Promise<ProcessQueueResponse> => {
        console.log('🔄 Appel process-email-queue...');
        const { data, error } = await supabase.functions.invoke('process-email-queue');
        console.log('Réponse process-email-queue:', data);
        if (error) {
          console.error('Erreur process-email-queue:', error);
          throw new Error(error.message || 'Erreur lors du traitement de la queue');
        }
        return data as ProcessQueueResponse;
      },
  });

  return {
    processQueue,
    isProcessing: processQueue.isPending,
  };
}