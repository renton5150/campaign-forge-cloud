
import { useState, useCallback } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Monitor, Smartphone, Save } from 'lucide-react';

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

  // Configuration simplifiée pour éviter les conflits de types
  const editorConfiguration = {
    toolbar: [
      'heading',
      '|',
      'fontSize',
      '|',
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
      'horizontalLine',
      '|',
      'undo',
      'redo'
    ],
    fontSize: {
      options: [
        '8px',
        '10px',
        '11px',
        '12px',
        '14px',
        '16px',
        '18px',
        '20px',
        '24px',
        '28px',
        '32px',
        '36px',
        '48px'
      ],
      supportAllValues: true
    },
    fontColor: {
      colors: [
        {
          color: 'hsl(0, 0%, 0%)',
          label: 'Black'
        },
        {
          color: 'hsl(0, 0%, 30%)',
          label: 'Dim grey'
        },
        {
          color: 'hsl(0, 0%, 60%)',
          label: 'Grey'
        },
        {
          color: 'hsl(0, 0%, 90%)',
          label: 'Light grey'
        },
        {
          color: 'hsl(0, 0%, 100%)',
          label: 'White',
          hasBorder: true
        },
        {
          color: 'hsl(0, 75%, 60%)',
          label: 'Red'
        },
        {
          color: 'hsl(30, 75%, 60%)',
          label: 'Orange'
        },
        {
          color: 'hsl(60, 75%, 60%)',
          label: 'Yellow'
        },
        {
          color: 'hsl(90, 75%, 60%)',
          label: 'Light green'
        },
        {
          color: 'hsl(120, 75%, 60%)',
          label: 'Green'
        },
        {
          color: 'hsl(150, 75%, 60%)',
          label: 'Aquamarine'
        },
        {
          color: 'hsl(180, 75%, 60%)',
          label: 'Turquoise'
        },
        {
          color: 'hsl(210, 75%, 60%)',
          label: 'Light blue'
        },
        {
          color: 'hsl(240, 75%, 60%)',
          label: 'Blue'
        },
        {
          color: 'hsl(270, 75%, 60%)',
          label: 'Purple'
        }
      ]
    },
    fontBackgroundColor: {
      colors: [
        {
          color: 'hsl(0, 0%, 100%)',
          label: 'White',
          hasBorder: true
        },
        {
          color: 'hsl(0, 0%, 90%)',
          label: 'Light grey'
        },
        {
          color: 'hsl(60, 75%, 60%)',
          label: 'Yellow'
        },
        {
          color: 'hsl(30, 75%, 60%)',
          label: 'Orange'
        },
        {
          color: 'hsl(0, 75%, 60%)',
          label: 'Red'
        },
        {
          color: 'hsl(120, 75%, 60%)',
          label: 'Green'
        },
        {
          color: 'hsl(240, 75%, 60%)',
          label: 'Blue'
        },
        {
          color: 'hsl(270, 75%, 60%)',
          label: 'Purple'
        }
      ]
    },
    heading: {
      options: [
        { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
        { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
        { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
        { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' }
      ]
    },
    table: {
      contentToolbar: [
        'tableColumn',
        'tableRow',
        'mergeTableCells',
        'tableProperties',
        'tableCellProperties'
      ]
    },
    image: {
      toolbar: [
        'imageStyle:alignLeft',
        'imageStyle:alignCenter',
        'imageStyle:alignRight',
        '|',
        'resizeImage',
        '|',
        'imageTextAlternative'
      ],
      styles: [
        'alignLeft',
        'alignCenter',
        'alignRight'
      ]
    },
    alignment: {
      options: [
        'left',
        'center',
        'right',
        'justify'
      ]
    },
    link: {
      decorators: {
        toggleDownloadable: {
          mode: 'manual',
          label: 'Downloadable',
          attributes: {
            download: 'file'
          }
        }
      }
    },
    language: 'fr'
  };

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
                    editor={ClassicEditor as any}
                    data={value}
                    config={editorConfiguration as any}
                    onChange={handleChange}
                    onReady={(editor) => {
                      console.log('CKEditor5 is ready to use!', editor);
                      console.log('Available plugins:', Array.from(editor.plugins).map(p => p.constructor.name));
                      console.log('Toolbar items:', Array.from(editor.ui.componentFactory.names()));
                    }}
                    onError={(error, { willEditorRestart }) => {
                      if (willEditorRestart) {
                        console.log('CKEditor5 will restart', error);
                      } else {
                        console.error('CKEditor5 error:', error);
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
