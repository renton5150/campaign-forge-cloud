
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Save, ArrowLeft, Palette, Type, Image, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { useTemplateCategories } from '@/hooks/useTemplateCategories';
import { useAuth } from '@/hooks/useAuth';
import TinyMCEEditor from '../EmailEditor/TinyMCEEditor';

interface TemplateEditorProps {
  templateId?: string;
  onBack: () => void;
}

export default function TemplateEditor({ templateId, onBack }: TemplateEditorProps) {
  const [templateData, setTemplateData] = useState({
    name: '',
    category: 'custom',
    description: '',
    html_content: '',
    tags: [] as string[],
    preview_text: '',
  });
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newTag, setNewTag] = useState('');

  const { toast } = useToast();
  const { user } = useAuth();
  const { createTemplate, updateTemplate, templates } = useEmailTemplates();
  const { categories } = useTemplateCategories();

  // Charger le template si on est en mode édition
  useEffect(() => {
    if (templateId && templates) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setTemplateData({
          name: template.name,
          category: template.category || 'custom',
          description: template.description || '',
          html_content: template.html_content,
          tags: template.tags || [],
          preview_text: template.preview_text || '',
        });
      }
    }
  }, [templateId, templates]);

  const handleSave = async () => {
    if (!templateData.name.trim()) {
      toast({
        title: 'Erreur',
        description: 'Le nom du template est requis',
        variant: 'destructive',
      });
      return;
    }

    if (!templateData.html_content.trim()) {
      toast({
        title: 'Erreur',
        description: 'Le contenu HTML est requis',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Erreur',
        description: 'Utilisateur non connecté',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      if (templateId) {
        await updateTemplate.mutateAsync({
          id: templateId,
          ...templateData,
        });
        toast({
          title: 'Succès',
          description: 'Template mis à jour avec succès',
        });
      } else {
        // Créer un objet complet pour la création
        const completeTemplateData = {
          ...templateData,
          tenant_id: user.tenant_id,
          created_by: user.id,
          is_system_template: false,
          is_favorite: false,
          thumbnail_url: null,
          mission_id: null,
        };
        await createTemplate.mutateAsync(completeTemplateData);
        toast({
          title: 'Succès',
          description: 'Template créé avec succès',
        });
      }
      onBack();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la sauvegarde du template',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !templateData.tags.includes(newTag.trim())) {
      setTemplateData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTemplateData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleContentChange = (content: string) => {
    setTemplateData(prev => ({
      ...prev,
      html_content: content
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {templateId ? 'Modifier le template' : 'Nouveau template'}
            </h1>
            <p className="text-muted-foreground">
              {templateId ? 'Modifiez votre template email' : 'Créez un nouveau template email'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsPreview(!isPreview)}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            {isPreview ? 'Éditeur' : 'Aperçu'}
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>

      {isPreview ? (
        // Mode Aperçu
        <Card>
          <CardHeader>
            <CardTitle>Aperçu du template</CardTitle>
            <CardDescription>
              Voici comment votre template apparaîtra aux destinataires
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-white">
              <style dangerouslySetInnerHTML={{
                __html: `
          .tinymce-preview {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
            font-size: 14px;
            line-height: 1.4;
            color: #333333;
            word-wrap: break-word;
            text-align: left;
            margin: 0;
            padding: 0;
          }
          
          .tinymce-preview > * {
            margin: 0;
            padding: 0;
          }
          
          .tinymce-preview p {
            margin: 0 0 6px 0;
            padding: 0;
            line-height: 1.4;
          }
          
          .tinymce-preview ul {
            margin: 0 0 6px 0;
            padding: 0 0 0 16px;
            list-style-type: disc;
          }
          
          .tinymce-preview ol {
            margin: 0 0 6px 0;
            padding: 0 0 0 16px;
            list-style-type: decimal;
          }
          
          .tinymce-preview li {
            margin: 0;
            padding: 0;
            line-height: 1.4;
          }
          
          .tinymce-preview ul li {
            margin: 0;
            padding: 0;
            line-height: 1.4;
          }
          
          .tinymce-preview strong, .tinymce-preview b {
            font-weight: bold;
            margin: 0;
            padding: 0;
          }
          
          .tinymce-preview em, .tinymce-preview i {
            font-style: italic;
            margin: 0;
            padding: 0;
          }
          
          .tinymce-preview h1, .tinymce-preview h2, .tinymce-preview h3, .tinymce-preview h4, .tinymce-preview h5, .tinymce-preview h6 {
            margin: 0 0 6px 0;
            padding: 0;
            font-weight: bold;
            line-height: 1.2;
          }
          
          .tinymce-preview h1 {
            font-size: 2em;
          }
          
          .tinymce-preview h2 {
            font-size: 1.5em;
          }
          
          .tinymce-preview h3 {
            font-size: 1.3em;
          }
          
          .tinymce-preview h4 {
            font-size: 1.1em;
          }
          
          .tinymce-preview h5, .tinymce-preview h6 {
            font-size: 1em;
          }
          
          .tinymce-preview a {
            color: #0066cc;
            text-decoration: underline;
            margin: 0;
            padding: 0;
          }
          
          .tinymce-preview a:hover {
            color: #0052a3;
          }
          
          .tinymce-preview img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 6px 0;
          }
          
          .tinymce-preview table {
            width: 100%;
            border-collapse: collapse;
            margin: 6px 0;
          }
          
          .tinymce-preview td, .tinymce-preview th {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          
          .tinymce-preview th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          
          .tinymce-preview blockquote {
            margin: 6px 0;
            padding-left: 16px;
            border-left: 4px solid #ddd;
            font-style: italic;
          }
          
          .tinymce-preview pre {
            background-color: #f5f5f5;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            margin: 6px 0;
          }
          
          .tinymce-preview code {
            background-color: #f5f5f5;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
          }
          
          .tinymce-preview hr {
            border: none;
            border-top: 1px solid #ddd;
            margin: 6px 0;
          }
          
          .tinymce-preview div {
            margin: 0;
            padding: 0;
          }
          
          .tinymce-preview br {
            margin: 0;
            padding: 0;
          }
        `
              }} />
              <div 
                className="tinymce-preview"
                dangerouslySetInnerHTML={{ __html: templateData.html_content }}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        // Mode Éditeur
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Panneau de configuration */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Informations de base */}
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du template</Label>
                  <Input
                    id="name"
                    value={templateData.name}
                    onChange={(e) => setTemplateData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nom du template"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie</Label>
                  <Select 
                    value={templateData.category} 
                    onValueChange={(value) => setTemplateData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Personnalisé</SelectItem>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={templateData.description}
                    onChange={(e) => setTemplateData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Description du template"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preview_text">Texte d'aperçu</Label>
                  <Textarea
                    id="preview_text"
                    value={templateData.preview_text}
                    onChange={(e) => setTemplateData(prev => ({ ...prev, preview_text: e.target.value }))}
                    placeholder="Texte qui apparaîtra dans l'aperçu de l'email"
                    rows={2}
                  />
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Ajouter un tag"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    />
                    <Button size="sm" onClick={handleAddTag}>
                      Ajouter
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {templateData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-red-500"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Éditeur */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Éditeur de contenu
                </CardTitle>
                <CardDescription>
                  Créez et modifiez le contenu de votre template
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="min-h-[500px]">
                  <TinyMCEEditor
                    value={templateData.html_content}
                    onChange={handleContentChange}
                    height="500px"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
