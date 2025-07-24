
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useContacts } from '@/hooks/useContacts';
import { useContactLists } from '@/hooks/useContactLists';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface CreateContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultListId?: string;
}

export default function CreateContactModal({ open, onOpenChange, defaultListId }: CreateContactModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    company: '',
    phone: '',
    notes: '',
    listId: defaultListId || '',
  });

  const { user } = useAuth();
  const { createContact, addToList } = useContacts();
  const { contactLists } = useContactLists();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Vérifications d'authentification
    if (!user) {
      toast({
        title: 'Erreur',
        description: 'Vous devez être connecté pour créer un contact',
        variant: 'destructive',
      });
      return;
    }

    // Pour les super_admin, on utilise un tenant_id fictif ou on permet la création sans tenant_id
    let tenantId = user.tenant_id;
    if (user.role === 'super_admin' && !tenantId) {
      // Les super_admin peuvent créer des contacts sans tenant_id spécifique
      tenantId = '00000000-0000-0000-0000-000000000000'; // UUID fictif pour les super_admin
    }

    if (!tenantId && user.role !== 'super_admin') {
      toast({
        title: 'Erreur',
        description: 'Votre compte n\'est pas encore configuré. Veuillez contacter l\'administrateur.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.email) {
      toast({
        title: 'Erreur',
        description: 'L\'email est obligatoire',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('Submitting contact creation...');
      console.log('User role:', user.role);
      console.log('User tenant_id:', user.tenant_id);
      console.log('Using tenant_id:', tenantId);
      
      const contact = await createContact.mutateAsync({
        email: formData.email.toLowerCase().trim(),
        first_name: formData.first_name.trim() || null,
        last_name: formData.last_name.trim() || null,
        company: formData.company.trim() || null,
        phone: formData.phone.trim() || null,
        notes: formData.notes.trim() || null,
        status: 'active',
        source: 'manual',
        validation_status: 'unknown',
        engagement_score: 0,
        language: 'fr',
        tags: [],
        custom_fields: {},
        last_activity_at: null,
      });

      console.log('Contact created, now adding to list if selected...');

      // Ajouter à la liste si sélectionnée (et différente de "no-list")
      if (formData.listId && formData.listId !== 'no-list' && contact) {
        await addToList.mutateAsync({
          contactId: contact.id,
          listId: formData.listId
        });
      }

      toast({
        title: 'Succès',
        description: 'Contact créé avec succès',
      });

      // Reset form
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        company: '',
        phone: '',
        notes: '',
        listId: defaultListId || '',
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating contact:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la création du contact',
        variant: 'destructive',
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const safeContactLists = Array.isArray(contactLists) ? contactLists : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nouveau contact</DialogTitle>
          <DialogDescription>
            Ajoutez un nouveau contact à votre base de données.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Prénom</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Nom</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="john.doe@exemple.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Entreprise</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              placeholder="Nom de l'entreprise"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="+33 1 23 45 67 89"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="listId">Liste de contacts</Label>
            <Select value={formData.listId} onValueChange={(value) => handleInputChange('listId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une liste (optionnel)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-list">Aucune liste</SelectItem>
                {safeContactLists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name} ({list.total_contacts || 0} contacts)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Notes personnalisées..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={createContact.isPending || addToList.isPending}
            >
              {createContact.isPending ? 'Création...' : 'Créer le contact'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
