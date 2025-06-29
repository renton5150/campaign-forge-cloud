
import { useState, useCallback } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';

// Import du build classic qui contient déjà les plugins de base
import {
  ClassicEditor,
  AccessibilityHelp,
  Alignment,
  Autoformat,
  AutoImage,
  AutoLink,
  Autosave,
  BlockQuote,
  Bold,
  CloudServices,
  Essentials,
  FontBackgroundColor,
  FontColor,
  FontFamily,
  FontSize,
  Heading,
  HorizontalLine,
  ImageBlock,
  ImageCaption,
  ImageInline,
  ImageInsert,
  ImageInsertViaUrl,
  ImageResize,
  ImageStyle,
  ImageTextAlternative,
  ImageToolbar,
  ImageUpload,
  Indent,
  IndentBlock,
  Italic,
  Link,
  LinkImage,
  List,
  ListProperties,
  Paragraph,
  PasteFromOffice,
  SelectAll,
  Strikethrough,
  Table,
  TableCaption,
  TableCellProperties,
  TableColumnResize,
  TableProperties,
  TableToolbar,
  TextTransformation,
  Underline,
  Undo
} from 'ckeditor5';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Monitor, Smartphone, Save } from 'lucide-react';

import 'ckeditor5/ckeditor5.css';

interface CKEditor5Props {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
}

export default function CKEditor5({ value, onChange, onSave }: CKEditor5Props) {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  const handleChange = useCallback((event: any, editor: any) => {
    const data = editor.getData();
    onChange(data);
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
                  <CKEditor
                    editor={ClassicEditor}
                    data={value}
                    config={{
                      plugins: [
                        AccessibilityHelp,
                        Alignment,
                        Autoformat,
                        AutoImage,
                        AutoLink,
                        Autosave,
                        BlockQuote,
                        Bold,
                        CloudServices,
                        Essentials,
                        FontBackgroundColor,
                        FontColor,
                        FontFamily,
                        FontSize,
                        Heading,
                        HorizontalLine,
                        ImageBlock,
                        ImageCaption,
                        ImageInline,
                        ImageInsert,
                        ImageInsertViaUrl,
                        ImageResize,
                        ImageStyle,
                        ImageTextAlternative,
                        ImageToolbar,
                        ImageUpload,
                        Indent,
                        IndentBlock,
                        Italic,
                        Link,
                        LinkImage,
                        List,
                        ListProperties,
                        Paragraph,
                        PasteFromOffice,
                        SelectAll,
                        Strikethrough,
                        Table,
                        TableCaption,
                        TableCellProperties,
                        TableColumnResize,
                        TableProperties,
                        TableToolbar,
                        TextTransformation,
                        Underline,
                        Undo
                      ],
                      toolbar: {
                        items: [
                          'undo',
                          'redo',
                          '|',
                          'heading',
                          '|',
                          'fontFamily',
                          'fontSize',
                          'fontColor',
                          'fontBackgroundColor',
                          '|',
                          'bold',
                          'italic',
                          'underline',
                          'strikethrough',
                          '|',
                          'alignment',
                          '|',
                          'bulletedList',
                          'numberedList',
                          '|',
                          'outdent',
                          'indent',
                          '|',
                          'link',
                          'insertImage',
                          'insertTable',
                          '|',
                          'blockQuote',
                          'horizontalLine'
                        ],
                        shouldNotGroupWhenFull: false
                      }
                    } as any}
                    onChange={handleChange}
                    onReady={(editor) => {
                      console.log('CKEditor5 prêt !', editor);
                    }}
                    onError={(error, { willEditorRestart }) => {
                      if (willEditorRestart) {
                        console.log('CKEditor5 va redémarrer', error);
                      } else {
                        console.error('Erreur CKEditor5:', error);
                      }
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
