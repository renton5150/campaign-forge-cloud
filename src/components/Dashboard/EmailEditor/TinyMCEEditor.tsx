
import { useState, useCallback, useEffect } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Monitor, Smartphone, Save, FolderOpen } from 'lucide-react';
import SaveTemplateModal from './SaveTemplateModal';
import PersonalTemplates from './PersonalTemplates';

interface TinyMCEEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  showTabs?: boolean;
  showToolbar?: boolean;
  height?: number;
}

export default function TinyMCEEditor({ 
  value, 
  onChange, 
  onSave,
  showTabs = true,
  showToolbar = true,
  height
}: TinyMCEEditorProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'templates'>('editor');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [domainInfo, setDomainInfo] = useState<string>('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editorHeight, setEditorHeight] = useState(height || 400);

  useEffect(() => {
    // Capturer les informations du domaine pour TinyMCE
    const currentDomain = window.location.hostname;
    const currentUrl = window.location.href;
    const domainDetails = `Domaine: ${currentDomain} | URL complète: ${currentUrl}`;
    setDomainInfo(domainDetails);
    console.log('🔍 Informations du domaine pour TinyMCE:', domainDetails);
  }, []);

  useEffect(() => {
    // Ajuster la hauteur dynamiquement si pas de hauteur spécifiée
    if (!height) {
      const calculateHeight = () => {
        const windowHeight = window.innerHeight;
        const availableHeight = windowHeight - 300; // Déduire pour les autres éléments
        setEditorHeight(Math.max(400, Math.min(800, availableHeight)));
      };

      calculateHeight();
      window.addEventListener('resize', calculateHeight);
      return () => window.removeEventListener('resize', calculateHeight);
    }
  }, [height]);

  const handleEditorChange = useCallback((content: string) => {
    onChange(content);
  }, [onChange]);

  const handleLoadTemplate = (htmlContent: string) => {
    onChange(htmlContent);
    setActiveTab('editor');
  };

  if (!showTabs) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 min-h-0">
          <Editor
            apiKey="bjlp8x727u9vmqvrd8pj9k0d04x2ycincthiln1kde17yxc6"
            value={value}
            onEditorChange={handleEditorChange}
            init={{
              height: editorHeight,
              menubar: false,
              plugins: [
                'advlist', 'autolink', 'lists', 'link', 'image', 
                'charmap', 'preview', 'anchor', 'searchreplace', 'visualblocks',
                'code', 'fullscreen', 'insertdatetime', 'media', 'table', 'help', 'wordcount'
              ],
              toolbar: 'fontfamily fontsize | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist | outdent indent | link image | table | font11pt | code preview | fullscreen',
              fontsize_formats: '8pt 9pt 10pt 11pt 12pt 13pt 14pt 16pt 18pt 20pt 24pt 28pt 32pt 36pt 48pt',
              content_style: 'body { font-family:Arial,Helvetica,sans-serif; font-size:14px }',
              forced_root_block: 'p',
              resize: true,
              setup: (editor) => {
                // Ajouter le bouton personnalisé 11pt
                editor.ui.registry.addButton('font11pt', {
                  text: '11pt',
                  tooltip: 'Appliquer la taille 11pt',
                  onAction: () => {
                    const selection = editor.selection.getContent();
                    if (selection) {
                      editor.execCommand('mceInsertContent', false, `<span style="font-size: 11pt;">${selection}</span>`);
                    } else {
                      editor.execCommand('mceInsertContent', false, '<span style="font-size: 11pt;">Texte 11pt</span>');
                    }
                    console.log('✅ Bouton 11pt cliqué - taille appliquée');
                  }
                });

                editor.on('init', () => {
                  console.log('🎯 TinyMCE initialisé avec bouton personnalisé 11pt');
                });
                
                editor.on('NodeChange', () => {
                  const fontSize = editor.queryCommandValue('FontSize');
                  console.log('🔍 Taille de police sélectionnée:', fontSize);
                });
              }
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Toolbar */}
      {showToolbar && (
        <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={onSave}>
                <Save className="h-4 w-4 mr-1" />
                Sauvegarder
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowSaveModal(true)}
                disabled={!value.trim()}
              >
                <FolderOpen className="h-4 w-4 mr-1" />
                Sauvegarder template
              </Button>
              <div className="text-xs text-gray-500 ml-4">
                {domainInfo}
              </div>
            </div>

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
        </div>
      )}

      {/* Contenu principal */}
      <div className="flex-1 overflow-hidden min-h-0">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="h-full flex flex-col">
          <TabsList className="w-full justify-start border-b flex-shrink-0">
            <TabsTrigger value="editor">Éditeur</TabsTrigger>
            <TabsTrigger value="preview">Aperçu</TabsTrigger>
            <TabsTrigger value="templates">Mes Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="flex-1 mt-0 p-6 min-h-0">
            <Card className="h-full flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle>Contenu de l'email</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-0">
                <div className="h-full border border-gray-200 rounded-lg overflow-hidden">
                  <Editor
                    apiKey="bjlp8x727u9vmqvrd8pj9k0d04x2ycincthiln1kde17yxc6"
                    value={value}
                    onEditorChange={handleEditorChange}
                    init={{
                      height: '100%',
                      menubar: false,
                      plugins: [
                        'advlist', 'autolink', 'lists', 'link', 'image', 
                        'charmap', 'preview', 'anchor', 'searchreplace', 'visualblocks',
                        'code', 'fullscreen', 'insertdatetime', 'media', 'table', 'help', 'wordcount'
                      ],
                      toolbar: 'fontfamily fontsize | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist | outdent indent | link image | table | font11pt | code preview | fullscreen',
                      fontsize_formats: '8pt 9pt 10pt 11pt 12pt 13pt 14pt 16pt 18pt 20pt 24pt 28pt 32pt 36pt 48pt',
                      content_style: 'body { font-family:Arial,Helvetica,sans-serif; font-size:14px }',
                      forced_root_block: 'p',
                      resize: true,
                      setup: (editor) => {
                        // Ajouter le bouton personnalisé 11pt
                        editor.ui.registry.addButton('font11pt', {
                          text: '11pt',
                          tooltip: 'Appliquer la taille 11pt',
                          onAction: () => {
                            const selection = editor.selection.getContent();
                            if (selection) {
                              // Appliquer 11pt au texte sélectionné
                              editor.execCommand('mceInsertContent', false, `<span style="font-size: 11pt;">${selection}</span>`);
                            } else {
                              // Si pas de sélection, insérer un placeholder
                              editor.execCommand('mceInsertContent', false, '<span style="font-size: 11pt;">Texte 11pt</span>');
                            }
                            console.log('✅ Bouton 11pt cliqué - taille appliquée');
                          }
                        });

                        editor.on('init', () => {
                          console.log('🎯 TinyMCE initialisé avec bouton personnalisé 11pt');
                          console.log('🔧 Bouton 11pt ajouté à la toolbar');
                        });
                        
                        editor.on('NodeChange', () => {
                          const fontSize = editor.queryCommandValue('FontSize');
                          console.log('🔍 Taille de police sélectionnée:', fontSize);
                        });
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 mt-0 p-6 min-h-0">
            <Card className="h-full flex flex-col">
              <CardHeader className="flex-shrink-0">
                <div className="flex justify-between items-center">
                  <CardTitle>Aperçu de l'email</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Eye className="h-4 w-4" />
                    <span className="text-sm text-gray-600">
                      {previewMode === 'mobile' ? 'Mobile' : 'Desktop'}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                <div className={`mx-auto bg-white border rounded-lg overflow-hidden ${
                  previewMode === 'mobile' ? 'max-w-sm' : 'max-w-2xl'
                }`}>
                  <div className="p-4">
                    <div 
                      dangerouslySetInnerHTML={{ __html: value }}
                      className="prose max-w-none"
                      style={{
                        fontFamily: 'Arial, sans-serif',
                        lineHeight: '1.6',
                        color: '#333333'
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="flex-1 mt-0 min-h-0">
            <Card className="h-full flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle>Mes Templates Personnels</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                <PersonalTemplates onLoadTemplate={handleLoadTemplate} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de sauvegarde */}
      <SaveTemplateModal
        open={showSaveModal}
        onOpenChange={setShowSaveModal}
        htmlContent={value}
      />
    </div>
  );
}
