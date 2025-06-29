
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { EmailTemplate } from '@/types/database';
import { Layout } from 'lucide-react';

interface TemplateSelectorProps {
  templates: EmailTemplate[];
  onSelect?: (template: EmailTemplate) => void;
}

export default function TemplateSelector({ templates, onSelect }: TemplateSelectorProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (template: EmailTemplate) => {
    if (onSelect) {
      onSelect(template);
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="fixed bottom-4 right-4 z-50">
          <Layout className="h-4 w-4 mr-2" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choisir un template</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card 
              key={template.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleSelect(template)}
            >
              <CardHeader className="pb-2">
                <div className="aspect-video bg-gray-100 rounded flex items-center justify-center mb-2">
                  {template.thumbnail_url ? (
                    <img 
                      src={template.thumbnail_url} 
                      alt={template.name}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <Layout className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <CardTitle className="text-sm">{template.name}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                <Badge variant="secondary" className="text-xs">
                  {template.category}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 text-center">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
