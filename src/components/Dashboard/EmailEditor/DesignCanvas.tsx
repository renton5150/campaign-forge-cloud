
import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Move, Copy } from 'lucide-react';
import { EmailComponent } from './types';

interface DesignCanvasProps {
  components: EmailComponent[];
  selectedComponent: string | null;
  onSelectComponent: (id: string | null) => void;
  onUpdateComponent: (id: string, updates: Partial<EmailComponent>) => void;
  onDeleteComponent: (id: string) => void;
  onAddComponent: (type: string, position?: number) => void;
  globalStyles: Record<string, any>;
}

export default function DesignCanvas({
  components,
  selectedComponent,
  onSelectComponent,
  onUpdateComponent,
  onDeleteComponent,
  onAddComponent,
  globalStyles
}: DesignCanvasProps) {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, componentId: string, index: number) => {
    e.dataTransfer.setData('componentId', componentId);
    e.dataTransfer.setData('sourceIndex', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const componentId = e.dataTransfer.getData('componentId');
    const sourceIndex = parseInt(e.dataTransfer.getData('sourceIndex'));
    
    if (sourceIndex !== targetIndex) {
      // Réorganiser les composants
      const newComponents = [...components];
      const [removed] = newComponents.splice(sourceIndex, 1);
      newComponents.splice(targetIndex, 0, removed);
      
      // Vous devriez avoir une fonction pour mettre à jour l'ordre des composants
      // Pour l'instant, on utilise onUpdateComponent pour chaque élément
    }
    
    setDragOverIndex(null);
  };

  const renderComponent = (component: EmailComponent, index: number) => {
    const isSelected = selectedComponent === component.id;
    
    return (
      <div
        key={component.id}
        className={`relative group border-2 transition-all ${
          isSelected ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-gray-300'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onSelectComponent(component.id);
        }}
        draggable
        onDragStart={(e) => handleDragStart(e, component.id, index)}
        onDragOver={(e) => handleDragOver(e, index)}
        onDrop={(e) => handleDrop(e, index)}
      >
        {/* Barre d'outils du composant */}
        {isSelected && (
          <div className="absolute -top-10 left-0 flex space-x-1 bg-white shadow-lg rounded border p-1 z-10">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                // Dupliquer le composant
                onAddComponent(component.type, index + 1);
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="cursor-move"
            >
              <Move className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteComponent(component.id);
              }}
            >
              <Trash2 className="h-3 w-3 text-red-500" />
            </Button>
          </div>
        )}

        {/* Contenu du composant */}
        <div style={component.styles}>
          {renderComponentContent(component)}
        </div>

        {/* Zone de drop */}
        {dragOverIndex === index && (
          <div className="absolute inset-x-0 -bottom-2 h-4 border-2 border-dashed border-blue-500 bg-blue-100 opacity-50" />
        )}
      </div>
    );
  };

  const renderComponentContent = (component: EmailComponent) => {
    switch (component.type) {
      case 'header':
        return (
          <div>
            <h1 style={{ margin: 0, fontSize: '24px' }}>{component.props.title}</h1>
            {component.props.subtitle && (
              <p style={{ margin: '5px 0 0 0', color: '#666' }}>{component.props.subtitle}</p>
            )}
          </div>
        );
      case 'text':
        return <div dangerouslySetInnerHTML={{ __html: component.props.content }} />;
      case 'image':
        return (
          <img
            src={component.props.src}
            alt={component.props.alt}
            style={{ maxWidth: component.props.width, height: 'auto' }}
          />
        );
      case 'button':
        return (
          <a
            href={component.props.href}
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: component.props.backgroundColor,
              color: component.props.textColor,
              textDecoration: 'none',
              borderRadius: '4px'
            }}
          >
            {component.props.text}
          </a>
        );
      case 'divider':
        return (
          <hr
            style={{
              border: 'none',
              height: component.props.height,
              backgroundColor: component.props.color
            }}
          />
        );
      case 'footer':
        return (
          <div>
            <p style={{ margin: 0 }}>{component.props.companyName}</p>
            <p style={{ margin: '5px 0 0 0' }}>{component.props.address}</p>
            <p style={{ margin: '10px 0 0 0' }}>
              <a href="#" style={{ color: '#666' }}>Se désabonner</a>
            </p>
          </div>
        );
      default:
        return <div>Composant inconnu</div>;
    }
  };

  return (
    <div 
      className="h-full bg-gray-50 p-8 overflow-auto"
      onClick={() => onSelectComponent(null)}
    >
      <Card className="mx-auto shadow-lg" style={{ maxWidth: globalStyles.maxWidth }}>
        <div 
          className="min-h-96"
          style={{
            backgroundColor: globalStyles.backgroundColor,
            fontFamily: globalStyles.fontFamily,
            padding: globalStyles.padding
          }}
        >
          {components.length === 0 ? (
            <div className="flex items-center justify-center h-96 text-gray-500">
              <div className="text-center">
                <Layout className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Glissez des composants ici pour commencer</p>
              </div>
            </div>
          ) : (
            components.map((component, index) => renderComponent(component, index))
          )}
        </div>
      </Card>
    </div>
  );
}
