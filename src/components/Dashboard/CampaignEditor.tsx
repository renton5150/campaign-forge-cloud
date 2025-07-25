
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Save, 
  Send, 
  Eye, 
  Smartphone, 
  Monitor,
  Calendar,
  Clock,
  Users,
  Mail
} from 'lucide-react';
import { Campaign, ABWinnerCriteria } from '@/types/database';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useContactLists } from '@/hooks/useContactLists';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { usePersonalTemplates } from '@/hooks/usePersonalTemplates';
import TinyMCEEditor from './EmailEditor/TinyMCEEditor';
import ContactListSelector from './ContactListSelector';
import SaveTemplateModal from './EmailEditor/SaveTemplateModal';
import SubjectPersonalization from './EmailEditor/SubjectPersonalization';

interface CampaignEditorProps {
  campaign?: Campaign | null;
  onClose: () => void;
}

export default function CampaignEditor({ campaign, onClose }: CampaignEditorProps) {
  const { createCampaign, updateCampaign } = useCampaigns();
  const { contactLists } = useContactLists();
  const { templates } = useEmailTemplates();
  const { templates: personalTemplates } = usePersonalTemplates();
  
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    preview_text: '',
    from_name: '',
    from_email: '',
    reply_to: '',
    html_content: '',
    template_id: null as string | null,
    scheduled_at: '',
    timezone: 'UTC',
    is_ab_test: false,
    ab_subject_b: '',
    ab_split_percentage: 50,
    ab_winner_criteria: 'open_rate' as ABWinnerCriteria,
    ab_test_duration_hours: 24,
    tags: [] as string[],
    notes: '',
  });

  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState('content');
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);

  // Simuler des contacts disponibles pour la personnalisation
  const [availableContacts] = useState([
    {
      email: 'john.doe@example.com',
      first_name: 'John',
      last_name: 'Doe',
      company: 'Acme Corp',
      phone: '+33 1 23 45 67 89',
      custom_fields: {
        poste: 'Développeur',
        secteur: 'Technologie',
        anciennete: '5 ans'
      }
    },
    {
      email: 'jane.smith@example.com',
      first_name: 'Jane',
      last_name: 'Smith',
      company: 'Tech Solutions',
      phone: '+33 1 23 45 67 90',
      custom_fields: {
        poste: 'Manager',
        secteur: 'IT',
        anciennete: '3 ans'
      }
    }
  ]);

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name,
        subject: campaign.subject,
        preview_text: campaign.preview_text || '',
        from_name: campaign.from_name,
        from_email: campaign.from_email,
        reply_to: campaign.reply_to || '',
        html_content: campaign.html_content,
        template_id: campaign.template_id || null,
        scheduled_at: campaign.scheduled_at ? campaign.scheduled_at.split('T')[0] : '',
        timezone: campaign.timezone,
        is_ab_test: campaign.is_ab_test,
        ab_subject_b: campaign.ab_subject_b || '',
        ab_split_percentage: campaign.ab_split_percentage,
        ab_winner_criteria: campaign.ab_winner_criteria,
        ab_test_duration_hours: campaign.ab_test_duration_hours,
        tags: campaign.tags || [],
        notes: campaign.notes || '',
      });
    }
  }, [campaign]);

  const handleSave = async () => {
    try {
      console.log('💾 Tentative de sauvegarde campagne...', formData);
      
      const campaignData = {
        ...formData,
        scheduled_at: formData.scheduled_at || null,
        status: 'draft' as const
      };
      
      console.log('📤 Données envoyées à Supabase:', campaignData);

      if (campaign) {
        console.log('🔄 Mise à jour campagne existante:', campaign.id);
        await updateCampaign.mutateAsync({
          id: campaign.id,
          ...campaignData
        });
      } else {
        console.log('✨ Création nouvelle campagne');
        await createCampaign.mutateAsync(campaignData as any);
      }
      
      console.log('✅ Campagne sauvegardée avec succès !');
      onClose();
    } catch (error) {
      console.error('❌ Erreur sauvegarde campagne:', error);
    }
  };

  const handleSchedule = async () => {
    try {
      const campaignData = {
        ...formData,
        scheduled_at: formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null,
        status: 'scheduled' as const
      };
      
      if (campaign) {
        await updateCampaign.mutateAsync({
          id: campaign.id,
          ...campaignData
        });
      } else {
        await createCampaign.mutateAsync(campaignData as any);
      }
      onClose();
    } catch (error) {
      console.error('Error scheduling campaign:', error);
    }
  };

  const handleLoadTemplate = (templateId: string) => {
    const template = personalTemplates.find(t => t.id === templateId);
    if (template) {
      setFormData({
        ...formData,
        html_content: template.html_content,
        template_id: templateId
      });
    }
  };

  if (activeTab === 'content') {
    return (
      <div className="h-screen flex flex-col">
        <div className="flex justify-between items-center p-4 border-b bg-white">
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={onClose}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {campaign ? 'Modifier la campagne' : 'Nouvelle campagne'}
              </h1>
              <p className="text-sm text-gray-600">{formData.name || 'Sans titre'}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Select value="" onValueChange={handleLoadTemplate}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Charger un template" />
              </SelectTrigger>
              <SelectContent>
                {personalTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setShowSaveTemplateModal(true)}>
              Sauvegarder template
            </Button>
            <Button variant="outline" onClick={() => setActiveTab('settings')}>
              Paramètres
            </Button>
            <Button variant="outline" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder
            </Button>
            <Button onClick={handleSchedule}>
              <Calendar className="h-4 w-4 mr-2" />
              Planifier
            </Button>
          </div>
        </div>

        <div className="flex-1">
          <TinyMCEEditor
            value={formData.html_content}
            onChange={(content) => setFormData({ ...formData, html_content: content })}
            onSave={handleSave}
            availableContacts={availableContacts}
            subject={formData.subject}
            onSubjectChange={(subject) => setFormData({ ...formData, subject })}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {campaign ? 'Modifier la campagne' : 'Nouvelle campagne'}
            </h1>
            <p className="text-gray-600 mt-2">
              Créez et personnalisez votre campagne email
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder
          </Button>
          <Button onClick={handleSchedule}>
            <Calendar className="h-4 w-4 mr-2" />
            Planifier
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="content">Contenu</TabsTrigger>
          <TabsTrigger value="recipients">Destinataires</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
          <TabsTrigger value="abtest">A/B Test</TabsTrigger>
          <TabsTrigger value="preview">Aperçu</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-6">
          <div className="text-center py-8">
            <Button onClick={() => setActiveTab('content')} size="lg">
              Ouvrir l'éditeur d'email
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="recipients">
          <ContactListSelector
            selectedLists={selectedLists}
            onListsChange={setSelectedLists}
            contactLists={contactLists || []}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Informations générales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Nom de la campagne</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Newsletter Mars 2024"
                  />
                </div>

                <SubjectPersonalization
                  subject={formData.subject}
                  onSubjectChange={(subject) => setFormData({ ...formData, subject })}
                  availableContacts={availableContacts}
                />

                <div>
                  <Label htmlFor="preview_text">Texte de prévisualisation</Label>
                  <Input
                    id="preview_text"
                    value={formData.preview_text}
                    onChange={(e) => setFormData({ ...formData, preview_text: e.target.value })}
                    placeholder="Visible dans la boîte de réception"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expéditeur</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="from_name">Nom de l'expéditeur</Label>
                  <Input
                    id="from_name"
                    value={formData.from_name}
                    onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
                    placeholder="Ex: Équipe Marketing"
                  />
                </div>

                <div>
                  <Label htmlFor="from_email">Email de l'expéditeur</Label>
                  <Input
                    id="from_email"
                    type="email"
                    value={formData.from_email}
                    onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
                    placeholder="Ex: marketing@monentreprise.com"
                  />
                </div>

                <div>
                  <Label htmlFor="reply_to">Email de réponse (optionnel)</Label>
                  <Input
                    id="reply_to"
                    type="email"
                    value={formData.reply_to}
                    onChange={(e) => setFormData({ ...formData, reply_to: e.target.value })}
                    placeholder="Ex: support@monentreprise.com"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Planification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="scheduled_at">Date d'envoi</Label>
                <Input
                  id="scheduled_at"
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="timezone">Fuseau horaire</Label>
                <Select value={formData.timezone} onValueChange={(value) => setFormData({ ...formData, timezone: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
                    <SelectItem value="America/New_York">America/New_York</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Métadonnées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notes internes sur cette campagne"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="abtest" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test A/B</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_ab_test}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_ab_test: checked })}
                />
                <Label>Activer le test A/B</Label>
              </div>

              {formData.is_ab_test && (
                <>
                  <SubjectPersonalization
                    subject={formData.ab_subject_b}
                    onSubjectChange={(subject) => setFormData({ ...formData, ab_subject_b: subject })}
                    availableContacts={availableContacts}
                  />

                  <div>
                    <Label htmlFor="ab_split_percentage">Pourcentage pour le test (%)</Label>
                    <Input
                      id="ab_split_percentage"
                      type="number"
                      min="1"
                      max="99"
                      value={formData.ab_split_percentage}
                      onChange={(e) => setFormData({ ...formData, ab_split_percentage: parseInt(e.target.value) })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="ab_winner_criteria">Critère de victoire</Label>
                    <Select
                      value={formData.ab_winner_criteria}
                      onValueChange={(value: ABWinnerCriteria) => 
                        setFormData({ ...formData, ab_winner_criteria: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open_rate">Taux d'ouverture</SelectItem>
                        <SelectItem value="click_rate">Taux de clic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="ab_test_duration_hours">Durée du test (heures)</Label>
                    <Input
                      id="ab_test_duration_hours"
                      type="number"
                      min="1"
                      value={formData.ab_test_duration_hours}
                      onChange={(e) => setFormData({ ...formData, ab_test_duration_hours: parseInt(e.target.value) })}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Aperçu de l'email</CardTitle>
                <div className="flex space-x-2">
                  <Button
                    variant={previewMode === 'desktop' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('desktop')}
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={previewMode === 'mobile' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('mobile')}
                  >
                    <Smartphone className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`mx-auto bg-white border rounded-lg overflow-hidden ${
                previewMode === 'mobile' ? 'max-w-sm' : 'max-w-2xl'
              }`}>
                <div className="p-4 border-b bg-gray-50">
                  <div className="text-sm text-gray-600">
                    <strong>De:</strong> {formData.from_name} &lt;{formData.from_email}&gt;
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Objet:</strong> {formData.subject}
                  </div>
                  {formData.preview_text && (
                    <div className="text-xs text-gray-500 mt-1">
                      {formData.preview_text}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div dangerouslySetInnerHTML={{ __html: formData.html_content }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SaveTemplateModal 
        open={showSaveTemplateModal}
        onOpenChange={setShowSaveTemplateModal}
        htmlContent={formData.html_content}
      />
    </div>
  );
}
