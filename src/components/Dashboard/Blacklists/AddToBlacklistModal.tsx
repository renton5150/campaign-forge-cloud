
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useBlacklists, Blacklist } from '@/hooks/useBlacklists';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AddToBlacklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'email' | 'domain';
  defaultValue?: string;
}

const AddToBlacklistModal = ({ isOpen, onClose, defaultType = 'email', defaultValue = '' }: AddToBlacklistModalProps) => {
  const [type, setType] = useState<'email' | 'domain'>(defaultType);
  const [value, setValue] = useState(defaultValue);
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState<Blacklist['category']>('manual');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user, session } = useAuth();
  const { addToBlacklist } = useBlacklists();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Debug logging
      console.log('Current user:', user);
      console.log('Current session:', session);
      console.log('User tenant_id:', user?.tenant_id);
      console.log('Session user:', session?.user);

      // Vérifier que l'utilisateur est authentifié
      if (!user || !session) {
        throw new Error('Utilisateur non authentifié. Veuillez vous reconnecter.');
      }

      if (!user.tenant_id) {
        throw new Error('Aucun tenant associé à votre compte. Veuillez contacter l\'administrateur.');
      }

      console.log('Adding to blacklist with data:', {
        type,
        value: value.trim().toLowerCase(),
        reason: reason.trim() || undefined,
        category,
        created_by: user.id,
        tenant_id: user.tenant_id
      });

      await addToBlacklist.mutateAsync({
        type,
        value: value.trim().toLowerCase(),
        reason: reason.trim() || undefined,
        category,
        created_by: user.id
      });

      toast({
        title: "Ajouté à la blacklist",
        description: `${type === 'email' ? 'Email' : 'Domaine'} ajouté avec succès`,
      });

      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout à la blacklist:', error);
      
      let errorMessage = "Impossible d'ajouter à la blacklist";
      
      if (error.message.includes('tenant_id') || error.message.includes('tenant')) {
        errorMessage = "Problème avec votre compte. Veuillez vous reconnecter.";
      } else if (error.message.includes('duplicate key')) {
        errorMessage = "Cet élément est déjà dans la blacklist.";
      } else if (error.message.includes('not allowed')) {
        errorMessage = "Vous n'avez pas les permissions nécessaires.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setValue('');
    setReason('');
    setCategory('manual');
    setType('email');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Show user debug info if there's an issue
  const showDebugInfo = !user?.tenant_id && user;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajouter à la blacklist</DialogTitle>
        </DialogHeader>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {showDebugInfo && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Debug: Utilisateur connecté mais sans tenant_id. 
              Email: {user.email}, ID: {user.id}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">Type</Label>
            <Select value={type} onValueChange={(value: 'email' | 'domain') => setType(value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Sélectionner le type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="domain">Domaine</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="value" className="text-right">
              {type === 'email' ? 'Email' : 'Domaine'}
            </Label>
            <Input
              id="value"
              type={type === 'email' ? 'email' : 'text'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={type === 'email' ? 'exemple@domaine.com' : 'exemple.com'}
              className="col-span-3"
              required
            />
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

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="reason" className="text-right pt-2">Raison</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Raison de l'ajout à la blacklist (optionnel)"
              className="col-span-3"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading || !value.trim() || !user?.tenant_id}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddToBlacklistModal;
