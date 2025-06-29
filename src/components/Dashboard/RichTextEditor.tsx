
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Bold, 
  Italic, 
  Underline, 
  Link, 
  Image, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  List,
  ListOrdered,
  Palette,
  Eye,
  Code
} from 'lucide-react';
import { EmailTemplate } from '@/types/database';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  templates?: EmailTemplate[];
  onTemplateSelect?: (template: EmailTemplate) => void;
}

export default function RichTextEditor({ 
  value, 
  onChange, 
  templates = [], 
  onTemplateSelect 
}: RichTextEditorProps) {
  const [viewMode, setViewMode] = useState<'editor' | 'preview' | 'code'>('editor');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template && onTemplateSelect) {
      onTemplateSelect(template);
      setSelectedTemplate(templateId);
    }
  };

  const insertHtml = (html: string) => {
    // Simple insertion au curseur (en mode réel, utiliser une librairie comme TinyMCE ou CKEditor)
    onChange(value + html);
  };

  const formatButtons = [
    { icon: Bold, label: 'Gras', html: '<strong></strong>' },
    { icon: Italic, label: 'Italique', html: '<em></em>' },
    { icon: Underline, label: 'Souligné', html: '<u></u>' },
    { icon: Link, label: 'Lien', html: '<a href=""></a>' },
    { icon: Image, label: 'Image', html: '<img src="" alt="" />' },
    { icon: AlignLeft, label: 'Aligner à gauche', html: '<div style="text-align: left;"></div>' },
    { icon: AlignCenter, label: 'Centrer', html: '<div style="text-align: center;"></div>' },
    { icon: AlignRight, label: 'Aligner à droite', html: '<div style="text-align: right;"></div>' },
    { icon: List, label: 'Liste à puces', html: '<ul><li></li></ul>' },
    { icon: ListOrdered, label: 'Liste numérotée', html: '<ol><li></li></ol>' },
  ];

  return (
    <div className="space-y-4">
      {/* Sélection de template */}
      {templates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Templates disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {templates.map((template) => (
                <Button
                  key={template.id}
                  variant={selectedTemplate === template.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  {template.name}
                  <Badge variant="secondary" className="ml-2">
                    {template.category}
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modes de vue */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <Button
            variant={viewMode === 'editor' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('editor')}
          >
            Éditeur
          </Button>
          <Button
            variant={viewMode === 'preview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('preview')}
          >
            <Eye className="h-4 w-4 mr-1" />
            Aperçu
          </Button>
          <Button
            variant={viewMode === 'code' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('code')}
          >
            <Code className="h-4 w-4 mr-1" />
            HTML
          </Button>
        </div>
      </div>

      {viewMode === 'editor' && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap gap-2">
              {formatButtons.map((button, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => insertHtml(button.html)}
                  title={button.label}
                >
                  <button.icon className="h-4 w-4" />
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Composez votre email ici... Vous pouvez utiliser du HTML."
              className="min-h-[400px] font-mono"
            />
          </CardContent>
        </Card>
      )}

      {viewMode === 'preview' && (
        <Card>
          <CardHeader>
            <CardTitle>Aperçu de l'email</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="border rounded-lg p-6 bg-white min-h-[400px]"
              dangerouslySetInnerHTML={{ __html: value }}
            />
          </CardContent>
        </Card>
      )}

      {viewMode === 'code' && (
        <Card>
          <CardHeader>
            <CardTitle>Code HTML</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="min-h-[400px] font-mono text-sm"
              placeholder="Code HTML de l'email"
            />
          </CardContent>
        </Card>
      )}

      {/* Variables disponibles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Variables disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              '{{first_name}}', '{{last_name}}', '{{email}}', '{{company}}',
              '{{unsubscribe_link}}', '{{company_name}}', '{{date}}', '{{subject}}'
            ].map((variable) => (
              <Badge
                key={variable}
                variant="outline"
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => insertHtml(variable)}
              >
                {variable}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
