
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Edit3, Eye, Palette, AlertCircle } from 'lucide-react';
import { usePersonalTemplates } from '@/hooks/usePersonalTemplates';
import TinyMCEEditor from '../EmailEditor/TinyMCEEditor';

interface CampaignContentProps {
  formData: any;
  updateFormData: (updates: any) => void;
}

export default function CampaignContent({ formData, updateFormData }: CampaignContentProps) {
  const { templates, isLoading } = usePersonalTemplates();
  const [showEditor, setShowEditor] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates?.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      updateFormData({
        template_id: templateId,
        html_content: template.html_content,
      });
    }
  };

  const handleStartFromScratch = () => {
    setSelectedTemplate(null);
    updateFormData({
      template_id: null,
      html_content: '<p>Votre contenu ici...</p>',
    });
    setShowEditor(true);
  };

  if (showEditor) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Éditeur de contenu</h2>
          <Button variant="outline" onClick={() => setShowEditor(false)}>
            <Eye className="h-4 w-4 mr-2" />
            Voir l'aperçu
          </Button>
        </div>
        
        <div className="h-96">
          <TinyMCEEditor
            value={formData.html_content}
            onChange={(content) => updateFormData({ html_content: content })}
            onSave={() => {}}
            availableContacts={[]}
            subject={formData.subject}
            onSubjectChange={(subject) => updateFormData({ subject })}
          />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold mb-2">Contenu de la campagne</h2>
        <p className="text-gray-600">Choisissez un template ou créez votre contenu personnalisé</p>
      </div>

      {!formData.html_content || formData.html_content === '<p>Votre contenu ici...</p>' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="cursor-pointer hover:border-blue-500 transition-colors" onClick={handleStartFromScratch}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5" />
                Créer à partir de zéro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Commencez avec un éditeur vide et créez votre contenu personnalisé
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Utiliser un template
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates && templates.length > 0 ? (
                  <>
                    <Select onValueChange={handleTemplateSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {selectedTemplate && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="font-medium">{selectedTemplate.name}</div>
                        <div className="text-sm text-gray-600">
                          {selectedTemplate.description || 'Template personnalisé'}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Aucun template trouvé. Créez d'abord des templates dans la section Templates.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Contenu de l'email
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setShowEditor(true)}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                  <Button variant="outline" onClick={() => updateFormData({ html_content: '<p>Votre contenu ici...</p>', template_id: null })}>
                    Recommencer
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-gray-50 max-h-64 overflow-y-auto">
                <div 
                  dangerouslySetInnerHTML={{ __html: formData.html_content }}
                  className="prose prose-sm max-w-none"
                />
              </div>
              
              {selectedTemplate && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <Badge variant="secondary">Template: {selectedTemplate.name}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">✅ Contenu configuré</h3>
            <p className="text-sm text-gray-700">
              Votre contenu est prêt. Vous pouvez maintenant passer à l'étape de planification.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
