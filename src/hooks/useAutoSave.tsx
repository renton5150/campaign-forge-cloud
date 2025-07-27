
import { useEffect, useRef } from 'react';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface AutoSaveOptions {
  formData: any;
  campaign?: any;
  onSaveSuccess?: () => void;
  onSaveError?: (error: any) => void;
  debounceMs?: number;
}

export function useAutoSave({
  formData,
  campaign,
  onSaveSuccess,
  onSaveError,
  debounceMs = 3000
}: AutoSaveOptions) {
  const { createCampaign, updateCampaign } = useCampaigns();
  const { user } = useAuth();
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const previousDataRef = useRef<string>('');

  useEffect(() => {
    if (!user) return;

    const currentDataString = JSON.stringify(formData);
    
    // Ne pas sauvegarder si les données n'ont pas changé
    if (currentDataString === previousDataRef.current) return;
    
    // Ne pas sauvegarder si les champs obligatoires sont vides
    if (!formData.name || !formData.subject || !formData.from_email) return;

    // Annuler le timeout précédent
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Programmer la sauvegarde
    timeoutRef.current = setTimeout(async () => {
      try {
        console.log('🔄 Auto-sauvegarde en cours...', formData);
        
        const campaignData = {
          name: formData.name,
          subject: formData.subject,
          from_email: formData.from_email,
          from_name: formData.from_name,
          html_content: formData.html_content,
          template_id: formData.template_id,
          scheduled_at: formData.send_immediately ? null : formData.scheduled_at,
          status: 'draft' as const,
          preview_text: '',
          reply_to: formData.from_email,
          timezone: 'UTC',
          is_ab_test: false,
          ab_subject_b: '',
          ab_split_percentage: 50,
          ab_winner_criteria: 'open_rate' as const,
          ab_test_duration_hours: 24,
          tags: [],
          notes: '',
          tenant_id: user.tenant_id,
          created_by: user.id,
        };

        if (campaign) {
          await updateCampaign.mutateAsync({ id: campaign.id, ...campaignData });
        } else {
          await createCampaign.mutateAsync(campaignData);
        }

        console.log('✅ Auto-sauvegarde réussie');
        previousDataRef.current = currentDataString;
        onSaveSuccess?.();
      } catch (error) {
        console.error('❌ Erreur auto-sauvegarde:', error);
        onSaveError?.(error);
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [formData, campaign, user, createCampaign, updateCampaign, onSaveSuccess, onSaveError, debounceMs]);

  return {
    isAutoSaving: !!timeoutRef.current
  };
}
