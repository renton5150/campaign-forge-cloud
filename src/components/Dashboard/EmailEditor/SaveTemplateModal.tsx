
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePersonalTemplates } from '@/hooks/usePersonalTemplates';

interface SaveTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  htmlContent: string;
}

export default function SaveTemplateModal({ open, onOpenChange, htmlContent }: SaveTemplateModalProps) {
  const [templateName, setTemplateName] = useState('');
  const { createTemplate } = usePersonalTemplates();

  const handleSave = async () => {
    if (!templateName.trim()) return;

    try {
      await createTemplate.mutateAsync({
        name: templateName.trim(),
        html_content: htmlContent,
      });
      
      setTemplateName('');
      onOpenChange(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sauvegarder comme template</DialogTitle>
          <DialogDescription>
            Donnez un nom à votre template pour le retrouver facilement plus tard.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nom
            </Label>
            <Input
              id="name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="col-span-3"
              placeholder="Mon template personnalisé"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!templateName.trim() || createTemplate.isPending}
          >
            {createTemplate.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
