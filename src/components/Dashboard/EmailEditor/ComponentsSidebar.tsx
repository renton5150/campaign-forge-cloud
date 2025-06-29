
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Type, 
  Image, 
  MousePointer, 
  Minus, 
  Layout,
  Mail
} from 'lucide-react';

interface ComponentsSidebarProps {
  onAddComponent: (type: string) => void;
}

const components = [
  { type: 'header', label: 'En-tête', icon: Layout, description: 'Titre et sous-titre' },
  { type: 'text', label: 'Texte', icon: Type, description: 'Bloc de texte formaté' },
  { type: 'image', label: 'Image', icon: Image, description: 'Image responsive' },
  { type: 'button', label: 'Bouton', icon: MousePointer, description: 'Bouton call-to-action' },
  { type: 'divider', label: 'Séparateur', icon: Minus, description: 'Ligne de séparation' },
  { type: 'footer', label: 'Pied de page', icon: Mail, description: 'Informations de contact' }
];

export default function ComponentsSidebar({ onAddComponent }: ComponentsSidebarProps) {
  return (
    <div className="p-4 h-full overflow-y-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Composants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {components.map((component) => (
            <Button
              key={component.type}
              variant="outline"
              className="w-full justify-start h-auto p-3"
              onClick={() => onAddComponent(component.type)}
            >
              <div className="flex items-start space-x-3">
                <component.icon className="h-5 w-5 mt-0.5 text-blue-600" />
                <div className="text-left">
                  <div className="font-medium">{component.label}</div>
                  <div className="text-xs text-gray-500">{component.description}</div>
                </div>
              </div>
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-lg">Variables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              '{{first_name}}',
              '{{last_name}}',
              '{{company}}',
              '{{email}}',
              '{{unsubscribe_link}}',
              '{{company_name}}'
            ].map((variable) => (
              <div
                key={variable}
                className="p-2 bg-gray-100 rounded cursor-pointer hover:bg-gray-200"
                onClick={() => navigator.clipboard.writeText(variable)}
              >
                {variable}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
