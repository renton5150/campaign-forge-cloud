
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { X, Plus, Save, Eye, Maximize2, Minimize2 } from 'lucide-react';
import { useMissions } from '@/hooks/useMissions';
import { useTemplateCategories } from '@/hooks/useTemplateCategories';
import { ExtendedEmailTemplate } from '@/hooks/useEmailTemplates';
import TinyMCEEditor from '../EmailEditor/TinyMCEEditor';

interface TemplateEditorProps {
  template?: ExtendedEmailTemplate;
  onSave: (template: Partial<ExtendedEmailTemplate>) => void;
  onClose: () => void;
}

export default function TemplateEditor({ template, onSave, onClose }: TemplateEditorProps) {
  const { missions } = useMissions();
  const { categories } = useTemplateCategories();
  
  const [formData, setFormData] = useState<Partial<ExtendedEmailTemplate>>({
    name: '',
    description: '',
    category: 'custom',
    html_content: '',
    preview_text: '',
    mission_id: null,
    tags: [],
    is_favorite: false,
    is_system_template: false,
    ...template
  });

  const [newTag, setNewTag] = useState('');
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (template) {
      setFormData(template);
    }
  }, [template]);

  const handleTagAdd = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleTagRemove = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-white rounded-lg flex flex-col transition-all duration-300 ${
        isFullscreen ? 'w-full h-full max-w-none max-h-none' : 'w-full max-w-7xl h-[95vh]'
      }`}>
        {/* Header */}
        <div className="p-4 border-b flex-shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              {template ? 'Modifier le template' : 'Créer un template'}
            </h2>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex overflow-hidden min-h-0">
          {/* Sidebar avec les paramètres - largeur réduite */}
          <div className="w-64 border-r bg-gray-50 p-4 overflow-y-auto flex-shrink-0">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium">Nom du template *</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="category" className="text-sm font-medium">Catégorie</Label>
                <Select
                  value={formData.category || 'custom'}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="mission" className="text-sm font-medium">Mission</Label>
                <Select
                  value={formData.mission_id || 'none'}
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    mission_id: value === 'none' ? null : value 
                  }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune mission</SelectItem>
                    {missions.map(mission => (
                      <SelectItem key={mission.id} value={mission.id}>
                        {mission.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="preview_text" className="text-sm font-medium">Texte d'aperçu</Label>
                <Textarea
                  id="preview_text"
                  value={formData.preview_text || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, preview_text: e.target.value }))}
                  rows={2}
                  placeholder="Texte affiché dans l'aperçu de l'email"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Tags</Label>
                <div className="flex gap-2 mt-1 mb-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Ajouter un tag"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleTagAdd())}
                    className="flex-1"
                  />
                  <Button type="button" onClick={handleTagAdd} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {formData.tags?.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleTagRemove(tag)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_favorite"
                  checked={formData.is_favorite || false}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_favorite: checked }))}
                />
                <Label htmlFor="is_favorite" className="text-sm font-medium">Template favori</Label>
              </div>
            </div>
          </div>

          {/* Zone d'édition principale */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Onglets */}
            <div className="p-4 border-b bg-white flex-shrink-0">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={activeTab === 'editor' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('editor')}
                  size="sm"
                >
                  Éditeur
                </Button>
                <Button
                  type="button"
                  variant={activeTab === 'preview' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('preview')}
                  size="sm"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Aperçu
                </Button>
              </div>
            </div>

            {/* Contenu de l'éditeur */}
            <div className="flex-1 overflow-hidden min-h-0">
              {activeTab === 'editor' ? (
                <div className="h-full bg-white">
                  <TinyMCEEditor
                    value={formData.html_content || ''}
                    onChange={(content) => setFormData(prev => ({ ...prev, html_content: content }))}
                    showTabs={false}
                    showToolbar={false}
                    height={600}
                  />
                </div>
              ) : (
                <div className="p-6 h-full overflow-y-auto bg-gray-50">
                  <div className="max-w-4xl mx-auto bg-white border rounded-lg shadow-sm">
                    <div className="p-8">
                      <div 
                        dangerouslySetInnerHTML={{ __html: formData.html_content || '' }}
                        className="prose max-w-none"
                        style={{
                          fontFamily: 'Arial, sans-serif',
                          lineHeight: '1.6',
                          color: '#333333'
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Footer avec les boutons */}
        <div className="p-4 border-t bg-gray-50 flex-shrink-0">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" onClick={handleSubmit}>
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
