
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface DeleteDomainModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  domainName: string;
  isDeleting: boolean;
}

export const DeleteDomainModal = ({ 
  open, 
  onClose, 
  onConfirm, 
  domainName, 
  isDeleting 
}: DeleteDomainModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Supprimer le domaine
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <p className="text-sm text-red-800">
              <strong>Attention :</strong> Cette action est irréversible.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-700">
              Vous êtes sur le point de supprimer le domaine :
            </p>
            <p className="font-mono bg-gray-100 p-2 rounded border text-sm">
              {domainName}
            </p>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Conséquences</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Les enregistrements DNS ne seront plus valides</li>
              <li>• Les serveurs SMTP liés perdront leur authentification</li>
              <li>• Les campagnes utilisant ce domaine pourraient échouer</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isDeleting}
            >
              Annuler
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={onConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
