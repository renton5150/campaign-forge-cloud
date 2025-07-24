
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useBlacklists, Blacklist } from '@/hooks/useBlacklists';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BulkImportModal = ({ isOpen, onClose }: BulkImportModalProps) => {
  const [type, setType] = useState<'email' | 'domain'>('email');
  const [category, setCategory] = useState<Blacklist['category']>('manual');
  const [items, setItems] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { bulkImportBlacklist } = useBlacklists();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!items.trim()) return;

    const itemList = items
      .split('\n')
      .map(item => item.trim())
      .filter(item => item.length > 0);

    if (itemList.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer au moins un élément",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await bulkImportBlacklist.mutateAsync({
        items: itemList,
        type,
        category
      });

      toast({
        title: "Import terminé",
        description: `${itemList.length} élément(s) ajouté(s) à la blacklist`,
      });

      onClose();
      resetForm();
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'importer les éléments",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setItems('');
    setType('email');
    setCategory('manual');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const itemCount = items.split('\n').filter(item => item.trim().length > 0).length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Upload className="mr-2 h-5 w-5" />
            Import en masse
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">Type</Label>
            <Select value={type} onValueChange={(value: 'email' | 'domain') => setType(value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Sélectionner le type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Emails</SelectItem>
                <SelectItem value="domain">Domaines</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">Catégorie</Label>
            <Select value={category} onValueChange={(value: Blacklist['category']) => setCategory(value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Sélectionner la catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manuel</SelectItem>
                <SelectItem value="bounce">Bounce</SelectItem>
                <SelectItem value="complaint">Plainte</SelectItem>
                <SelectItem value="competitor">Concurrent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="items">
              {type === 'email' ? 'Emails' : 'Domaines'} (un par ligne)
            </Label>
            <Textarea
              id="items"
              value={items}
              onChange={(e) => setItems(e.target.value)}
              placeholder={type === 'email' 
                ? 'exemple1@domaine.com\nexemple2@domaine.com\nexemple3@domaine.com' 
                : 'exemple1.com\nexemple2.com\nexemple3.com'
              }
              className="h-32"
              required
            />
            {itemCount > 0 && (
              <p className="text-sm text-gray-600">
                {itemCount} élément(s) à importer
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading || !items.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Importer {itemCount > 0 && `(${itemCount})`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BulkImportModal;
