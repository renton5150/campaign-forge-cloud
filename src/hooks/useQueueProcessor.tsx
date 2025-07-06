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
      const { data, error } = await supabase.functions.invoke('process-email-queue');
      
      if (error) {
        throw new Error(error.message || 'Erreur lors du traitement de la queue');
      }
      
      return data;
    },
  });

  return {
    processQueue,
    isProcessing: processQueue.isPending,
  };
}