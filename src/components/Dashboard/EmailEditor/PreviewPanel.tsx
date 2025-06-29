
import { Card } from '@/components/ui/card';

interface PreviewPanelProps {
  html: string;
  mode: 'desktop' | 'mobile' | 'gmail' | 'outlook';
  variables: Record<string, string>;
}

export default function PreviewPanel({ html, mode, variables }: PreviewPanelProps) {
  // Remplacer les variables dans le HTML
  let processedHTML = html;
  Object.entries(variables).forEach(([variable, value]) => {
    processedHTML = processedHTML.replace(
      new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 
      value
    );
  });

  const getPreviewStyles = () => {
    switch (mode) {
      case 'mobile':
        return {
          width: '375px',
          minHeight: '600px',
          margin: '0 auto',
          border: '1px solid #ddd',
          borderRadius: '8px',
          overflow: 'hidden'
        };
      case 'gmail':
        return {
          width: '100%',
          maxWidth: '600px',
          margin: '0 auto',
          backgroundColor: '#f6f8fc',
          padding: '20px',
          fontFamily: 'Roboto, Arial, sans-serif'
        };
      case 'outlook':
        return {
          width: '100%',
          maxWidth: '600px',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          fontFamily: 'Calibri, Arial, sans-serif'
        };
      default: // desktop
        return {
          width: '100%',
          maxWidth: '800px',
          margin: '0 auto'
        };
    }
  };

  return (
    <div className="p-8 bg-gray-50 h-full overflow-auto">
      <div className="mb-4 text-center">
        <h3 className="text-lg font-medium">
          Aperçu - {mode === 'desktop' ? 'Desktop' : mode === 'mobile' ? 'Mobile' : mode === 'gmail' ? 'Gmail' : 'Outlook'}
        </h3>
      </div>
      
      <Card className="shadow-lg" style={getPreviewStyles()}>
        <div 
          className="email-preview"
          dangerouslySetInnerHTML={{ __html: processedHTML }}
          style={{
            minHeight: '400px',
            backgroundColor: '#ffffff'
          }}
        />
      </Card>

      {mode === 'mobile' && (
        <div className="mt-4 text-center text-sm text-gray-600">
          <p>Aperçu mobile - 375px de largeur</p>
        </div>
      )}
    </div>
  );
}
