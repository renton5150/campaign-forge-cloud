
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { usePersonalTemplates } from '@/hooks/usePersonalTemplates';
import { Trash2, Eye } from 'lucide-react';

interface PersonalTemplatesProps {
  onLoadTemplate: (htmlContent: string) => void;
}

export default function PersonalTemplates({ onLoadTemplate }: PersonalTemplatesProps) {
  const { templates, isLoading, deleteTemplate } = usePersonalTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleDelete = async (templateId: string) => {
    try {
      await deleteTemplate.mutateAsync(templateId);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  const generatePreview = (htmlContent: string) => {
    // Créer un aperçu simplifié du contenu HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    return textContent.substring(0, 100) + (textContent.length > 100 ? '...' : '');
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="text-center text-gray-500">Chargement des templates...</div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="p-4">
        <div className="text-center text-gray-500">
          <p className="mb-2">Aucun template sauvegardé</p>
          <p className="text-sm">Créez votre premier template en utilisant le bouton "Sauvegarder template"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-medium">Mes Templates ({templates.length})</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="relative">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium truncate">
                {template.name}
              </CardTitle>
              <p className="text-xs text-gray-500">
                {new Date(template.created_at).toLocaleDateString('fr-FR')}
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="bg-gray-50 rounded p-2 mb-3 h-20 overflow-hidden">
                <div className="text-xs text-gray-600 line-clamp-4">
                  {generatePreview(template.html_content)}
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <Button
                  size="sm"
                  onClick={() => onLoadTemplate(template.html_content)}
                  className="flex-1 mr-2"
                >
                  Charger
                </Button>
                
                <div className="flex space-x-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer le template</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir supprimer le template "{template.name}" ? Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(template.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de prévisualisation */}
      {selectedTemplate && (
        <AlertDialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
          <AlertDialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Aperçu: {templates.find(t => t.id === selectedTemplate)?.name}
              </AlertDialogTitle>
            </AlertDialogHeader>
            <div className="mt-4">
              <div 
                className="border rounded p-4 bg-white"
                dangerouslySetInnerHTML={{ 
                  __html: templates.find(t => t.id === selectedTemplate)?.html_content || '' 
                }}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Fermer</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
