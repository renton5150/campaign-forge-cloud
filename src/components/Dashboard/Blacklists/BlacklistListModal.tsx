
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useBlacklistLists, BlacklistList } from '@/hooks/useBlacklistLists';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BlacklistListModalProps {
  isOpen: boolean;
  onClose: () => void;
  list?: BlacklistList;
}

const BlacklistListModal = ({ isOpen, onClose, list }: BlacklistListModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'email' | 'domain' | 'mixed'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { createBlacklistList, updateBlacklistList } = useBlacklistLists();
  const { toast } = useToast();

  useEffect(() => {
    if (list) {
      setName(list.name);
      setDescription(list.description || '');
      setType(list.type);
    } else {
      resetForm();
    }
  }, [list, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      if (list) {
        await updateBlacklistList.mutateAsync({
          id: list.id,
          name: name.trim(),
          description: description.trim() || undefined,
          type,
        });
        toast({
          title: "Liste mise à jour",
          description: "La liste de blacklist a été mise à jour avec succès",
        });
      } else {
        await createBlacklistList.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          type,
          is_active: true,
          created_by: '' // sera rempli par le hook
        });
        toast({
          title: "Liste créée",
          description: "La liste de blacklist a été créée avec succès",
        });
      }

      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      setError(error.message || "Une erreur est survenue");
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setType('email');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {list ? 'Modifier la liste' : 'Créer une liste de blacklist'}
          </DialogTitle>
        </DialogHeader>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de la liste</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Concurrents, Bounces, etc."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type de liste</Label>
            <Select value={type} onValueChange={(value: 'email' | 'domain' | 'mixed') => setType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner le type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Emails uniquement</SelectItem>
                <SelectItem value="domain">Domaines uniquement</SelectItem>
                <SelectItem value="mixed">Emails et domaines</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnel)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description de la liste..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {list ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BlacklistListModal;
