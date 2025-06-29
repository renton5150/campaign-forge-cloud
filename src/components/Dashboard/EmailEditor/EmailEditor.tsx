
import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Save, 
  Eye, 
  Smartphone, 
  Monitor, 
  Download, 
  Upload,
  Undo,
  Copy
} from 'lucide-react';
import { EmailTemplate } from '@/types/database';
import ComponentsSidebar from './ComponentsSidebar';
import DesignCanvas from './DesignCanvas';
import PropertiesPanel from './PropertiesPanel';
import PreviewPanel from './PreviewPanel';
import TemplateSelector from './TemplateSelector';
import { EmailComponent, EmailEditorState } from './types';

interface EmailEditorProps {
  value: string;
  onChange: (value: string) => void;
  templates?: EmailTemplate[];
  onTemplateSelect?: (template: EmailTemplate) => void;
  onSave?: () => void;
}

export default function EmailEditor({ 
  value, 
  onChange, 
  templates = [], 
  onTemplateSelect,
  onSave 
}: EmailEditorProps) {
  const [activeTab, setActiveTab] = useState<'design' | 'preview' | 'html'>('design');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile' | 'gmail' | 'outlook'>('desktop');
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  
  const [editorState, setEditorState] = useState<EmailEditorState>({
    components: [],
    globalStyles: {
      backgroundColor: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      maxWidth: '600px',
      padding: '20px'
    },
    variables: {
      '{{first_name}}': 'John',
      '{{last_name}}': 'Doe', 
      '{{company}}': 'Acme Corp',
      '{{email}}': 'john@example.com'
    },
    history: [],
    currentVersion: 0
  });

  const handleAddComponent = useCallback((componentType: string, position?: number) => {
    const newComponent: EmailComponent = {
      id: `${componentType}_${Date.now()}`,
      type: componentType as any,
      props: getDefaultProps(componentType),
      styles: getDefaultStyles(componentType)
    };

    setEditorState(prev => ({
      ...prev,
      components: position !== undefined 
        ? [...prev.components.slice(0, position), newComponent, ...prev.components.slice(position)]
        : [...prev.components, newComponent],
      history: [...prev.history.slice(0, prev.currentVersion + 1), { ...prev }],
      currentVersion: prev.currentVersion + 1
    }));
  }, []);

  const handleUpdateComponent = useCallback((id: string, updates: Partial<EmailComponent>) => {
    setEditorState(prev => ({
      ...prev,
      components: prev.components.map(comp => 
        comp.id === id ? { ...comp, ...updates } : comp
      ),
      history: [...prev.history.slice(0, prev.currentVersion + 1), { ...prev }],
      currentVersion: prev.currentVersion + 1
    }));
  }, []);

  const handleDeleteComponent = useCallback((id: string) => {
    setEditorState(prev => ({
      ...prev,
      components: prev.components.filter(comp => comp.id !== id),
      history: [...prev.history.slice(0, prev.currentVersion + 1), { ...prev }],
      currentVersion: prev.currentVersion + 1
    }));
    
    if (selectedComponent === id) {
      setSelectedComponent(null);
    }
  }, [selectedComponent]);

  const handleUndo = useCallback(() => {
    if (editorState.currentVersion > 0) {
      const previousState = editorState.history[editorState.currentVersion - 1];
      setEditorState(prev => ({
        ...previousState,
        history: prev.history,
        currentVersion: prev.currentVersion - 1
      }));
    }
  }, [editorState]);

  const generateHTML = useCallback(() => {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Template</title>
  <style>
    body { 
      margin: 0; 
      padding: 0; 
      font-family: ${editorState.globalStyles.fontFamily}; 
      background-color: ${editorState.globalStyles.backgroundColor};
    }
    .email-container { 
      max-width: ${editorState.globalStyles.maxWidth}; 
      margin: 0 auto; 
      padding: ${editorState.globalStyles.padding};
    }
    @media only screen and (max-width: 600px) {
      .email-container { max-width: 100% !important; }
      .mobile-hide { display: none !important; }
      .mobile-full { width: 100% !important; }
    }
  </style>
</head>
<body>
  <div class="email-container">
    ${editorState.components.map(component => renderComponentHTML(component)).join('')}
  </div>
</body>
</html>`;
    
    // Replace variables
    let processedHTML = html;
    Object.entries(editorState.variables).forEach(([variable, value]) => {
      processedHTML = processedHTML.replace(new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    });
    
    onChange(processedHTML);
    return processedHTML;
  }, [editorState, onChange]);

  const handleExportHTML = useCallback(() => {
    const html = generateHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'email-template.html';
    a.click();
    URL.revokeObjectURL(url);
  }, [generateHTML]);

  const handleImportHTML = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const html = e.target?.result as string;
        onChange(html);
        // TODO: Parse HTML back to components
      };
      reader.readAsText(file);
    }
  }, [onChange]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar gauche - Composants */}
      <div className="w-64 bg-white border-r border-gray-200">
        <ComponentsSidebar onAddComponent={handleAddComponent} />
      </div>

      {/* Zone centrale */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={handleUndo}>
                <Undo className="h-4 w-4 mr-1" />
                Annuler
              </Button>
              <Button variant="outline" size="sm" onClick={onSave}>
                <Save className="h-4 w-4 mr-1" />
                Sauvegarder
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportHTML}>
                <Download className="h-4 w-4 mr-1" />
                Exporter
              </Button>
              <div className="relative">
                <input
                  type="file"
                  accept=".html"
                  onChange={handleImportHTML}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-1" />
                  Importer
                </Button>
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

        {/* Contenu principal */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="h-full">
            <TabsList className="w-full justify-start border-b">
              <TabsTrigger value="design">Design</TabsTrigger>
              <TabsTrigger value="preview">Aperçu</TabsTrigger>
              <TabsTrigger value="html">HTML</TabsTrigger>
            </TabsList>

            <div className="flex h-full">
              <div className="flex-1 overflow-auto">
                <TabsContent value="design" className="h-full mt-0">
                  <DesignCanvas
                    components={editorState.components}
                    selectedComponent={selectedComponent}
                    onSelectComponent={setSelectedComponent}
                    onUpdateComponent={handleUpdateComponent}
                    onDeleteComponent={handleDeleteComponent}
                    onAddComponent={handleAddComponent}
                    globalStyles={editorState.globalStyles}
                  />
                </TabsContent>

                <TabsContent value="preview" className="h-full mt-0">
                  <PreviewPanel
                    html={generateHTML()}
                    mode={previewMode}
                    variables={editorState.variables}
                  />
                </TabsContent>

                <TabsContent value="html" className="h-full mt-0">
                  <div className="p-4">
                    <textarea
                      value={generateHTML()}
                      onChange={(e) => onChange(e.target.value)}
                      className="w-full h-full font-mono text-sm border rounded-lg p-4"
                    />
                  </div>
                </TabsContent>
              </div>

              {/* Panneau propriétés */}
              {activeTab === 'design' && (
                <div className="w-80 bg-white border-l border-gray-200">
                  <PropertiesPanel
                    selectedComponent={selectedComponent ? 
                      editorState.components.find(c => c.id === selectedComponent) : null
                    }
                    onUpdateComponent={handleUpdateComponent}
                    globalStyles={editorState.globalStyles}
                    onUpdateGlobalStyles={(styles) => 
                      setEditorState(prev => ({ ...prev, globalStyles: { ...prev.globalStyles, ...styles } }))
                    }
                    variables={editorState.variables}
                    onUpdateVariables={(variables) =>
                      setEditorState(prev => ({ ...prev, variables: { ...prev.variables, ...variables } }))
                    }
                  />
                </div>
              )}
            </div>
          </Tabs>
        </div>
      </div>

      {/* Template Selector Modal */}
      {templates.length > 0 && (
        <TemplateSelector
          templates={templates}
          onSelect={onTemplateSelect}
        />
      )}
    </div>
  );
}

function getDefaultProps(componentType: string): Record<string, any> {
  switch (componentType) {
    case 'header':
      return { title: 'Titre principal', subtitle: 'Sous-titre optionnel' };
    case 'text':
      return { content: 'Votre contenu texte ici...' };
    case 'image':
      return { src: '/placeholder.svg', alt: 'Image', width: '100%' };
    case 'button':
      return { text: 'Cliquez ici', href: '#', backgroundColor: '#007bff', textColor: '#ffffff' };
    case 'divider':
      return { height: '1px', color: '#e5e5e5' };
    case 'footer':
      return { companyName: '{{company_name}}', address: 'Votre adresse ici' };
    default:
      return {};
  }
}

function getDefaultStyles(componentType: string): Record<string, any> {
  switch (componentType) {
    case 'header':
      return { textAlign: 'center', padding: '20px', backgroundColor: '#f8f9fa' };
    case 'text':
      return { padding: '10px', fontSize: '16px', lineHeight: '1.5' };
    case 'image':
      return { textAlign: 'center', padding: '10px' };
    case 'button':
      return { textAlign: 'center', padding: '20px' };
    case 'divider':
      return { margin: '20px 0' };
    case 'footer':
      return { textAlign: 'center', padding: '20px', fontSize: '12px', color: '#666' };
    default:
      return {};
  }
}

function renderComponentHTML(component: EmailComponent): string {
  const styles = Object.entries(component.styles)
    .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
    .join('; ');

  switch (component.type) {
    case 'header':
      return `
        <div style="${styles}">
          <h1 style="margin: 0; font-size: 24px;">${component.props.title}</h1>
          ${component.props.subtitle ? `<p style="margin: 5px 0 0 0; color: #666;">${component.props.subtitle}</p>` : ''}
        </div>
      `;
    case 'text':
      return `<div style="${styles}">${component.props.content}</div>`;
    case 'image':
      return `
        <div style="${styles}">
          <img src="${component.props.src}" alt="${component.props.alt}" style="max-width: ${component.props.width}; height: auto;" />
        </div>
      `;
    case 'button':
      return `
        <div style="${styles}">
          <a href="${component.props.href}" style="display: inline-block; padding: 12px 24px; background-color: ${component.props.backgroundColor}; color: ${component.props.textColor}; text-decoration: none; border-radius: 4px;">${component.props.text}</a>
        </div>
      `;
    case 'divider':
      return `<hr style="border: none; height: ${component.props.height}; background-color: ${component.props.color}; ${styles}" />`;
    case 'footer':
      return `
        <div style="${styles}">
          <p style="margin: 0;">${component.props.companyName}</p>
          <p style="margin: 5px 0 0 0;">${component.props.address}</p>
          <p style="margin: 10px 0 0 0;">
            <a href="{{unsubscribe_link}}" style="color: #666;">Se désabonner</a>
          </p>
        </div>
      `;
    default:
      return '';
  }
}
