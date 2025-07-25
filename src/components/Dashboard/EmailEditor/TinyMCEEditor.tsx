
import { useState, useCallback, useEffect } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Monitor, Smartphone, Save, FolderOpen, Type } from 'lucide-react';
import SaveTemplateModal from './SaveTemplateModal';
import PersonalTemplates from './PersonalTemplates';
import PersonalizationPanel from './PersonalizationPanel';
import { generatePreview } from '@/utils/emailPersonalization';

interface TinyMCEEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  showTabs?: boolean;
  showToolbar?: boolean;
  height?: number;
  availableContacts?: any[];
  subject?: string;
  onSubjectChange?: (subject: string) => void;
}

export default function TinyMCEEditor({ 
  value, 
  onChange, 
  onSave,
  showTabs = true,
  showToolbar = true,
  height,
  availableContacts = [],
  subject = '',
  onSubjectChange
}: TinyMCEEditorProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'templates' | 'personalization'>('editor');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [domainInfo, setDomainInfo] = useState<string>('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editorHeight, setEditorHeight] = useState(height || 400);
  const [editorRef, setEditorRef] = useState<any>(null);

  useEffect(() => {
    const currentDomain = window.location.hostname;
    const currentUrl = window.location.href;
    const domainDetails = `Domaine: ${currentDomain} | URL complète: ${currentUrl}`;
    setDomainInfo(domainDetails);
    console.log('🔍 Informations du domaine pour TinyMCE:', domainDetails);
  }, []);

  useEffect(() => {
    if (!height) {
      const calculateHeight = () => {
        const windowHeight = window.innerHeight;
        const availableHeight = windowHeight - 300;
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

  const handleInsertVariable = (variable: string) => {
    if (editorRef) {
      editorRef.execCommand('mceInsertContent', false, variable);
    }
  };

  const handleInsertVariableInSubject = (variable: string) => {
    if (onSubjectChange) {
      const newSubject = subject + variable;
      onSubjectChange(newSubject);
    }
  };

  const previewContent = generatePreview(value);
  const previewSubject = generatePreview(subject);

  if (!showTabs) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 min-h-0">
          <Editor
            apiKey="bjlp8x727u9vmqvrd8pj9k0d04x2ycincthiln1kde17yxc6"
            value={value}
            onEditorChange={handleEditorChange}
            onInit={(evt, editor) => setEditorRef(editor)}
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
    <div className="h-full flex bg-gray-50">
      {/* Contenu principal */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
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

        <div className="flex-1 overflow-hidden min-h-0">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="h-full flex flex-col">
            <TabsList className="w-full justify-start border-b flex-shrink-0">
              <TabsTrigger value="editor">Éditeur</TabsTrigger>
              <TabsTrigger value="preview">Aperçu</TabsTrigger>
              <TabsTrigger value="templates">Mes Templates</TabsTrigger>
              <TabsTrigger value="personalization">
                <Type className="h-4 w-4 mr-1" />
                Personnalisation
              </TabsTrigger>
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
                      onInit={(evt, editor) => setEditorRef(editor)}
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
                    <div className="p-4 border-b bg-gray-50">
                      <div className="text-sm text-gray-600 mb-2">
                        <strong>Objet:</strong> {previewSubject || subject || 'Aucun objet'}
                      </div>
                      <div className="text-xs text-gray-500">
                        Variables remplacées par des valeurs d'exemple
                      </div>
                    </div>
                    <div className="p-4">
                      <div 
                        dangerouslySetInnerHTML={{ __html: previewContent }}
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

            <TabsContent value="personalization" className="flex-1 mt-0 p-6 min-h-0">
              <PersonalizationPanel
                onInsertVariable={handleInsertVariable}
                previewText={value}
                availableContacts={availableContacts}
                className="h-full"
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Panneau de personnalisation latéral (optionnel) */}
      {activeTab === 'editor' && (
        <div className="w-80 border-l border-gray-200 bg-white flex-shrink-0">
          <PersonalizationPanel
            onInsertVariable={handleInsertVariable}
            previewText={value}
            availableContacts={availableContacts}
            className="h-full border-none"
          />
        </div>
      )}

      {/* Modal de sauvegarde */}
      <SaveTemplateModal
        open={showSaveModal}
        onOpenChange={setShowSaveModal}
        htmlContent={value}
      />
    </div>
  );
}
