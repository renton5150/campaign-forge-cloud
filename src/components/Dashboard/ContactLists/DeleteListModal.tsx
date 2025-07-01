import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useContactLists } from '@/hooks/useContactLists';
import { useToast } from '@/hooks/use-toast';
import { ContactList } from '@/types/database';
import { AlertTriangle } from 'lucide-react';

interface DeleteListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list: ContactList | null;
}

export default function DeleteListModal({ open, onOpenChange, list }: DeleteListModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { deleteContactList } = useContactLists();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!list) return;

    setIsDeleting(true);
    
    try {
      await deleteContactList.mutateAsync(list.id);
      
      toast({
        title: "Succès",
        description: "La liste a été supprimée avec succès",
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la liste",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Supprimer la liste
          </DialogTitle>
          <DialogDescription>
            Êtes-vous sûr de vouloir supprimer la liste "<strong>{list?.name}</strong>" ?
            Cette action est irréversible et supprimera également tous les liens avec les contacts.
          </DialogDescription>
        </DialogHeader>
        
        {list?.total_contacts && list.total_contacts > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              ⚠️ Cette liste contient <strong>{list.total_contacts} contact{list.total_contacts > 1 ? 's' : ''}</strong>. 
              Les contacts ne seront pas supprimés, mais ils ne feront plus partie de cette liste.
            </p>
          </div>
        )}
        
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Suppression...' : 'Supprimer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}