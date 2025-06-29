
import { useState, useCallback } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Monitor, Smartphone, Save } from 'lucide-react';

interface TinyMCEEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
}

export default function TinyMCEEditor({ value, onChange, onSave }: TinyMCEEditorProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  const handleEditorChange = useCallback((content: string) => {
    onChange(content);
  }, [onChange]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={onSave}>
              <Save className="h-4 w-4 mr-1" />
              Sauvegarder
            </Button>
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

      {/* Contenu principal */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="h-full">
          <TabsList className="w-full justify-start border-b">
            <TabsTrigger value="editor">Éditeur</TabsTrigger>
            <TabsTrigger value="preview">Aperçu</TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="h-full mt-0 p-6">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Contenu de l'email</CardTitle>
              </CardHeader>
              <CardContent className="h-full">
                <div className="h-96 border border-gray-200 rounded-lg overflow-hidden">
                  <Editor
                    apiKey="bjlp8x727u9vmqvrd8pj9k0d04x2ycincthiln1kde17yxc6"
                    value={value}
                    onEditorChange={handleEditorChange}
                    init={{
                      height: 400,
                      menubar: false,
                      plugins: [
                        'advlist', 'autolink', 'lists', 'link', 'image', 
                        'charmap', 'preview', 'anchor', 'searchreplace', 'visualblocks',
                        'code', 'fullscreen', 'insertdatetime', 'media', 'table', 'help', 'wordcount',
                        'fontfamily', 'fontsize', 'forecolor', 'backcolor'
                      ],
                      toolbar: 'fontfamily fontsize forecolor backcolor | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist | outdent indent | link image | table | code preview',
                      font_family_formats: 'Arial=arial,helvetica,sans-serif; Times New Roman=times new roman,times,serif; Courier New=courier new,courier,monospace; Georgia=georgia,serif; Verdana=verdana,geneva,sans-serif;',
                      fontsize_formats: '8pt 10pt 11pt 12pt 14pt 16pt 18pt 20pt 24pt 28pt 32pt 36pt',
                      content_style: 'body { font-family:Arial,Helvetica,sans-serif; font-size:14px }'
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="h-full mt-0 p-6">
            <Card className="h-full">
              <CardHeader>
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
              <CardContent>
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
        </Tabs>
      </div>
    </div>
  );
}
