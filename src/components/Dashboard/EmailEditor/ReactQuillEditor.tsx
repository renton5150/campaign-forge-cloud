
import { useState, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Monitor, Smartphone, Save } from 'lucide-react';

interface ReactQuillEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
}

const modules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    ['link', 'image'],
    [{ 'align': [] }],
    ['clean']
  ],
};

const formats = [
  'bold', 'italic', 'underline',
  'link', 'image',
  'align'
];

export default function ReactQuillEditor({ value, onChange, onSave }: ReactQuillEditorProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  const handleChange = useCallback((content: string) => {
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
                <ReactQuill
                  value={value}
                  onChange={handleChange}
                  modules={modules}
                  formats={formats}
                  theme="snow"
                  style={{ height: '400px' }}
                />
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
