import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useContactLists } from '@/hooks/useContactLists';
import { useToast } from '@/hooks/use-toast';
import { ContactList } from '@/types/database';

interface EditListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list: ContactList | null;
}

export default function EditListModal({ open, onOpenChange, list }: EditListModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { updateContactList } = useContactLists();
  const { toast } = useToast();

  useEffect(() => {
    if (list) {
      setName(list.name);
      setDescription(list.description || '');
    }
  }, [list]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!list || !name.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom de la liste est requis",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      await updateContactList.mutateAsync({
        id: list.id,
        name: name.trim(),
        description: description.trim() || null,
      });
      
      toast({
        title: "Succès",
        description: "La liste a été modifiée avec succès",
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier la liste",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier la liste</DialogTitle>
          <DialogDescription>
            Modifiez les informations de votre liste de contacts.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de la liste *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Clients VIP"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description optionnelle de la liste"
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Modification...' : 'Modifier la liste'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}