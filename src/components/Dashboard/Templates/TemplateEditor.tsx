
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { useAuth } from '@/hooks/useAuth';
import { EmailTemplate } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { Tag } from 'lucide-react';
import TinyMCEEditor from '../EmailEditor/TinyMCEEditor';

interface TemplateEditorProps {
  templateId?: string;
  onSave?: (templateData: Partial<EmailTemplate>) => Promise<void>;
  onClose: () => void;
}

export default function TemplateEditor({ templateId, onSave, onClose }: TemplateEditorProps) {
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('transactional');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [previewText, setPreviewText] = useState('');
  const { templates, createTemplate, updateTemplate } = useEmailTemplates();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (templateId && templates.length > 0) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setTemplateName(template.name);
        setDescription(template.description || '');
        setContent(template.html_content || '');
        setCategory(template.category || 'transactional');
        setTags(template.tags || []);
        setPreviewText(template.preview_text || '');
      }
    }
  }, [templateId, templates]);

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && newTag.trim() !== '') {
      e.preventDefault();
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom du template est obligatoire",
        variant: "destructive",
      });
      return;
    }

    try {
      const templateData = {
        name: templateName,
        category: category,
        description: description,
        html_content: content,
        tags: tags,
        preview_text: previewText,
        tenant_id: user?.tenant_id || null,
        created_by: user?.id || '',
        is_system_template: false,
        is_favorite: false,
        mission_id: null,
        thumbnail_url: null
      };

      if (templateId) {
        await updateTemplate.mutateAsync({ id: templateId, ...templateData });
      } else {
        await createTemplate.mutateAsync(templateData);
      }

      if (onSave) {
        await onSave(templateData);
      }

      toast({
        title: "Succès",
        description: "Template sauvegardé avec succès",
      });
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le template",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* En-tête fixe avec les informations du template */}
      <div className="flex-shrink-0 bg-white border-b">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">{templateId ? 'Modifier' : 'Nouveau'} Template</CardTitle>
            <CardDescription>
              Créez et personnalisez vos templates d'email avec variables de personnalisation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="templateName">Nom du template</Label>
                <Input
                  type="text"
                  id="templateName"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Ex: Template de bienvenue"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choisir une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transactional">Transactionnel</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="autres">Autres</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez l'usage de ce template..."
                rows={2}
                className="resize-none"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="previewText">Texte de prévisualisation</Label>
              <Input
                type="text"
                id="previewText"
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder="Ex: Bonjour {{PRENOM}}, découvrez nos nouveautés..."
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="text"
                  placeholder="Ajouter un tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  className="flex-1"
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center space-x-1">
                    <Tag className="h-3 w-3" />
                    <span>{tag}</span>
                    <button
                      type="button"
                      className="ml-1 text-muted-foreground hover:text-foreground"
                      onClick={() => removeTag(tag)}
                    >
                      &times;
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Éditeur - zone extensible */}
      <div className="flex-1 overflow-hidden">
        <TinyMCEEditor
          value={content}
          onChange={setContent}
          onSave={handleSave}
          showTabs={true}
          showToolbar={true}
          availableContacts={[]}
        />
      </div>

      {/* Boutons d'action fixes en bas */}
      <div className="flex-shrink-0 bg-white border-t p-4">
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSave}>
            {templateId ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </div>
    </div>
  );
}
