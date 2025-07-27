
import { useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ExitConfirmationProps {
  hasUnsavedChanges: boolean;
  onConfirmExit: () => void;
  onCancelExit: () => void;
  isOpen: boolean;
}

export default function ExitConfirmation({
  hasUnsavedChanges,
  onConfirmExit,
  onCancelExit,
  isOpen
}: ExitConfirmationProps) {
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  return (
    <AlertDialog open={isOpen} onOpenChange={onCancelExit}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Modifications non sauvegardées</AlertDialogTitle>
          <AlertDialogDescription>
            Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir quitter ?
            Toutes les modifications seront perdues.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancelExit}>
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmExit}>
            Quitter sans sauvegarder
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
