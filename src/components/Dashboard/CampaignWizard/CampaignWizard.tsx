
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Save, Send } from 'lucide-react';
import { Campaign } from '@/types/database';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import CampaignBasicInfo from './CampaignBasicInfo';
import CampaignRecipients from './CampaignRecipients';
import CampaignContent from './CampaignContent';
import CampaignSchedule from './CampaignSchedule';

interface CampaignWizardProps {
  campaign?: Campaign | null;
  onClose: () => void;
}

interface CampaignFormData {
  name: string;
  subject: string;
  from_email: string;
  from_name: string;
  smtp_server_id: string;
  selected_lists: string[];
  template_id: string | null;
  html_content: string;
  scheduled_at: string;
  send_immediately: boolean;
}

export default function CampaignWizard({ campaign, onClose }: CampaignWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CampaignFormData>({
    name: campaign?.name || '',
    subject: campaign?.subject || '',
    from_email: campaign?.from_email || '',
    from_name: campaign?.from_name || '',
    smtp_server_id: '',
    selected_lists: [],
    template_id: campaign?.template_id || null,
    html_content: campaign?.html_content || '',
    scheduled_at: campaign?.scheduled_at || '',
    send_immediately: true,
  });

  const { createCampaign, updateCampaign } = useCampaigns();
  const { user } = useAuth();
  const { toast } = useToast();

  const steps = [
    { id: 1, title: 'Informations de base', subtitle: 'Nom, expéditeur et objet' },
    { id: 2, title: 'Destinataires', subtitle: 'Sélection des listes' },
    { id: 3, title: 'Contenu', subtitle: 'Template et personnalisation' },
    { id: 4, title: 'Planification', subtitle: 'Envoi et programmation' },
  ];

  const updateFormData = (updates: Partial<CampaignFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast({
        title: 'Erreur',
        description: 'Utilisateur non connecté',
        variant: 'destructive',
      });
      return;
    }

    try {
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

      toast({
        title: '✅ Campagne sauvegardée',
        description: 'Votre campagne a été sauvegardée avec succès',
      });
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder la campagne',
        variant: 'destructive',
      });
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name && formData.subject && formData.from_email;
      case 2:
        return formData.selected_lists.length > 0;
      case 3:
        return formData.html_content;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <CampaignBasicInfo formData={formData} updateFormData={updateFormData} />;
      case 2:
        return <CampaignRecipients formData={formData} updateFormData={updateFormData} />;
      case 3:
        return <CampaignContent formData={formData} updateFormData={updateFormData} />;
      case 4:
        return <CampaignSchedule formData={formData} updateFormData={updateFormData} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={onClose}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {campaign ? 'Modifier la campagne' : 'Nouvelle campagne'}
              </h1>
              <p className="text-gray-600">
                {formData.name || 'Campagne sans titre'}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder
            </Button>
          </div>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center space-x-3 ${
                currentStep >= step.id ? 'text-blue-600' : 'text-gray-400'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step.id ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}>
                  {step.id}
                </div>
                <div className="hidden md:block">
                  <div className="font-medium">{step.title}</div>
                  <div className="text-xs text-gray-500">{step.subtitle}</div>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-px mx-4 ${
                  currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto py-8 px-6">
        <Card>
          <CardContent className="p-6">
            {renderStepContent()}
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="bg-white border-t px-6 py-4 sticky bottom-0">
        <div className="max-w-4xl mx-auto flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Précédent
          </Button>
          
          <div className="flex space-x-2">
            {currentStep === 4 ? (
              <Button
                onClick={handleSave}
                disabled={!canProceed()}
              >
                <Send className="h-4 w-4 mr-2" />
                Finaliser la campagne
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
              >
                Suivant
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
