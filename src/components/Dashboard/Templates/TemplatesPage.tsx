import { useState } from 'react';
import { Plus, Search, Grid, List, Star, Copy, Edit, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { useMissions } from '@/hooks/useMissions';
import { useTemplateCategories } from '@/hooks/useTemplateCategories';
import { useToast } from '@/hooks/use-toast';
import TemplateCard from './TemplateCard';
import TemplateEditor from './TemplateEditor';

const TemplatesPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMission, setSelectedMission] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [deleteConfirmTemplate, setDeleteConfirmTemplate] = useState<any>(null);

  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate, duplicateTemplate, toggleFavorite } = useEmailTemplates();
  const { missions } = useMissions();
  const { categories } = useTemplateCategories();
  const { toast } = useToast();

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesMission = selectedMission === 'all' || template.mission_id === selectedMission;
    
    return matchesSearch && matchesCategory && matchesMission;
  });

  const totalTemplates = templates.length;
  const favoriteTemplates = templates.filter(t => t.is_favorite).length;
  const systemTemplates = templates.filter(t => t.is_system_template).length;
  const customTemplates = templates.filter(t => !t.is_system_template).length;

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setShowEditor(true);
  };

  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleSaveTemplate = async (templateData: any) => {
    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({ id: editingTemplate.id, ...templateData });
        toast({
          title: "Template mis à jour",
          description: "Le template a été mis à jour avec succès.",
        });
      } else {
        await createTemplate.mutateAsync(templateData);
        toast({
          title: "Template créé",
          description: "Le template a été créé avec succès.",
        });
      }
      setShowEditor(false);
      setEditingTemplate(null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de la sauvegarde du template.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = (template: any) => {
    if (template.is_system_template) {
      toast({
        title: "Suppression impossible",
        description: "Les templates système ne peuvent pas être supprimés.",
        variant: "destructive",
      });
      return;
    }
    setDeleteConfirmTemplate(template);
  };

  const confirmDeleteTemplate = async () => {
    if (!deleteConfirmTemplate) return;
    
    try {
      await deleteTemplate.mutateAsync(deleteConfirmTemplate.id);
      toast({
        title: "Template supprimé",
        description: "Le template a été supprimé avec succès.",
      });
      setDeleteConfirmTemplate(null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de la suppression du template.",
        variant: "destructive",
      });
    }
  };

  const handleDuplicateTemplate = async (template: any) => {
    try {
      await duplicateTemplate.mutateAsync(template.id);
      toast({
        title: "Template dupliqué",
        description: "Le template a été dupliqué avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de la duplication du template.",
        variant: "destructive",
      });
    }
  };

  const handleToggleFavorite = async (template: any) => {
    try {
      await toggleFavorite.mutateAsync({ id: template.id, is_favorite: !template.is_favorite });
      toast({
        title: template.is_favorite ? "Retiré des favoris" : "Ajouté aux favoris",
        description: `Le template a été ${template.is_favorite ? 'retiré des' : 'ajouté aux'} favoris.`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de la mise à jour des favoris.",
        variant: "destructive",
      });
    }
  };

  const handlePreviewTemplate = (template: any) => {
    setPreviewTemplate(template);
  };

  if (showEditor) {
    return (
      <TemplateEditor
        template={editingTemplate}
        onSave={handleSaveTemplate}
        onClose={() => {
          setShowEditor(false);
          setEditingTemplate(null);
        }}
      />
    );
  }

  if (previewTemplate) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] flex flex-col">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Aperçu du template</h2>
              <Button variant="ghost" size="sm" onClick={() => setPreviewTemplate(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto bg-white border rounded-lg p-6">
              <div 
                dangerouslySetInnerHTML={{ __html: previewTemplate.html_content || '' }}
                className="prose max-w-none"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Gestion des templates</h1>
          <p className="text-muted-foreground">
            Créez et gérez vos templates d'emailing
          </p>
        </div>
        <Button onClick={handleCreateTemplate}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau template
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTemplates}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Favoris</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{favoriteTemplates}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Système</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemTemplates}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personnalisés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customTemplates}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres et recherche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher des templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Toutes les catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedMission} onValueChange={setSelectedMission}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Toutes les missions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les missions</SelectItem>
                {missions.map((mission) => (
                  <SelectItem key={mission.id} value={mission.id}>
                    {mission.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">Tous</TabsTrigger>
          <TabsTrigger value="favorites">Favoris</TabsTrigger>
          <TabsTrigger value="system">Système</TabsTrigger>
          <TabsTrigger value="custom">Personnalisés</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Aucun template trouvé</p>
              <Button onClick={handleCreateTemplate} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Créer votre premier template
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEdit={handleEditTemplate}
                  onDelete={handleDeleteTemplate}
                  onDuplicate={handleDuplicateTemplate}
                  onToggleFavorite={handleToggleFavorite}
                  onPreview={handlePreviewTemplate}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                        <span className="text-xs font-medium">
                          {template.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold">{template.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {template.description || 'Aucune description'}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline">{template.category}</Badge>
                          {template.is_system_template && (
                            <Badge variant="secondary">Système</Badge>
                          )}
                          {template.is_favorite && (
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleFavorite(template)}
                      >
                        <Star className={`h-4 w-4 ${template.is_favorite ? 'text-yellow-500 fill-current' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicateTemplate(template)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTemplate(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!template.is_system_template && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTemplate(template)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="favorites">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {templates.filter(t => t.is_favorite).map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={handleEditTemplate}
                onDelete={handleDeleteTemplate}
                onDuplicate={handleDuplicateTemplate}
                onToggleFavorite={handleToggleFavorite}
                onPreview={handlePreviewTemplate}
              />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="system">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {templates.filter(t => t.is_system_template).map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={handleEditTemplate}
                onDelete={handleDeleteTemplate}
                onDuplicate={handleDuplicateTemplate}
                onToggleFavorite={handleToggleFavorite}
                onPreview={handlePreviewTemplate}
              />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="custom">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {templates.filter(t => !t.is_system_template).map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={handleEditTemplate}
                onDelete={handleDeleteTemplate}
                onDuplicate={handleDuplicateTemplate}
                onToggleFavorite={handleToggleFavorite}
                onPreview={handlePreviewTemplate}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!deleteConfirmTemplate} onOpenChange={() => setDeleteConfirmTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le template</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le template "{deleteConfirmTemplate?.name}" ? 
              Cette action est irréversible et le template sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTemplate}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TemplatesPage;
