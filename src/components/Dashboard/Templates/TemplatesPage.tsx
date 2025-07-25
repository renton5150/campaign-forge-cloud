
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Filter, 
  Grid, 
  List, 
  Star, 
  TrendingUp,
  FolderOpen,
  Tag,
  Calendar
} from 'lucide-react';
import { useEmailTemplates, ExtendedEmailTemplate } from '@/hooks/useEmailTemplates';
import { useMissions } from '@/hooks/useMissions';
import { useTemplateCategories } from '@/hooks/useTemplateCategories';
import { useToast } from '@/hooks/use-toast';
import TemplateCard from './TemplateCard';
import TemplateEditor from './TemplateEditor';

export default function TemplatesPage() {
  const { 
    templates, 
    isLoading, 
    createTemplate, 
    updateTemplate, 
    deleteTemplate, 
    duplicateTemplate,
    toggleFavorite 
  } = useEmailTemplates();
  const { missions } = useMissions();
  const { categories } = useTemplateCategories();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMission, setSelectedMission] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ExtendedEmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<ExtendedEmailTemplate | null>(null);

  // Filtrage des templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesMission = selectedMission === 'all' || template.mission_id === selectedMission;
    const matchesFavorites = !showFavoritesOnly || template.is_favorite;

    return matchesSearch && matchesCategory && matchesMission && matchesFavorites;
  });

  // Statistiques
  const totalTemplates = templates.length;
  const favoriteTemplates = templates.filter(t => t.is_favorite).length;
  const personalTemplates = templates.filter(t => !t.is_system_template).length;
  const systemTemplates = templates.filter(t => t.is_system_template).length;

  const handleSaveTemplate = async (templateData: Partial<ExtendedEmailTemplate>) => {
    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({ id: editingTemplate.id, ...templateData });
        toast({
          title: "Template mis à jour",
          description: "Le template a été modifié avec succès.",
        });
      } else {
        await createTemplate.mutateAsync(templateData as any);
        toast({
          title: "Template créé",
          description: "Le nouveau template a été créé avec succès.",
        });
      }
      setShowEditor(false);
      setEditingTemplate(null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la sauvegarde.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async (template: ExtendedEmailTemplate) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le template "${template.name}" ?`)) {
      try {
        await deleteTemplate.mutateAsync(template.id);
        toast({
          title: "Template supprimé",
          description: "Le template a été supprimé avec succès.",
        });
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors de la suppression.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDuplicateTemplate = async (template: ExtendedEmailTemplate) => {
    try {
      await duplicateTemplate.mutateAsync(template.id);
      toast({
        title: "Template dupliqué",
        description: "Le template a été dupliqué avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la duplication.",
        variant: "destructive",
      });
    }
  };

  const handleToggleFavorite = async (template: ExtendedEmailTemplate) => {
    try {
      await toggleFavorite.mutateAsync({ 
        id: template.id, 
        is_favorite: !template.is_favorite 
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour des favoris.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Chargement des templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Templates d'emailing</h1>
          <p className="text-gray-600">Gérez vos templates d'emails personnalisés</p>
        </div>
        <Button onClick={() => setShowEditor(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau template
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTemplates}</div>
            <p className="text-xs text-muted-foreground">Templates disponibles</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Favoris</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{favoriteTemplates}</div>
            <p className="text-xs text-muted-foreground">Templates favoris</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personnels</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{personalTemplates}</div>
            <p className="text-xs text-muted-foreground">Templates personnalisés</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Système</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemTemplates}</div>
            <p className="text-xs text-muted-foreground">Templates système</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher des templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedMission} onValueChange={setSelectedMission}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Mission" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les missions</SelectItem>
                {missions.map(mission => (
                  <SelectItem key={mission.id} value={mission.id}>
                    {mission.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={showFavoritesOnly ? "default" : "outline"}
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              <Star className="h-4 w-4 mr-2" />
              Favoris uniquement
            </Button>

            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des templates */}
      <div className={`
        ${viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
          : 'space-y-4'
        }
      `}>
        {filteredTemplates.map(template => (
          <TemplateCard
            key={template.id}
            template={template}
            onEdit={(template) => {
              setEditingTemplate(template);
              setShowEditor(true);
            }}
            onDuplicate={handleDuplicateTemplate}
            onDelete={handleDeleteTemplate}
            onPreview={(template) => setPreviewTemplate(template)}
            onToggleFavorite={handleToggleFavorite}
          />
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">
            Aucun template trouvé
          </h3>
          <p className="text-gray-500">
            {searchTerm || selectedCategory !== 'all' || selectedMission !== 'all' || showFavoritesOnly
              ? 'Modifiez vos filtres ou créez un nouveau template'
              : 'Créez votre premier template pour commencer'
            }
          </p>
        </div>
      )}

      {/* Éditeur de template */}
      {showEditor && (
        <TemplateEditor
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onClose={() => {
            setShowEditor(false);
            setEditingTemplate(null);
          }}
        />
      )}

      {/* Modal de prévisualisation */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">
                  Aperçu: {previewTemplate.name}
                </h2>
                <Button variant="ghost" onClick={() => setPreviewTemplate(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-6">
              <div 
                className="border rounded p-4 bg-white"
                dangerouslySetInnerHTML={{ __html: previewTemplate.html_content }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
