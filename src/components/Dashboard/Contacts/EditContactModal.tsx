import { useState, useEffect } from 'react';
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
import { Contact } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface EditContactModalProps {
  contact: Contact;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditContactModal({ contact, open, onOpenChange }: EditContactModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    company: '',
    phone: '',
    notes: '',
    status: 'active',
    validation_status: 'unknown',
  });

  const { updateContact } = useContacts();
  const { toast } = useToast();

  // Initialiser le formulaire avec les données du contact
  useEffect(() => {
    if (contact) {
      setFormData({
        email: contact.email || '',
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        company: contact.company || '',
        phone: contact.phone || '',
        notes: contact.notes || '',
        status: contact.status || 'active',
        validation_status: contact.validation_status || 'unknown',
      });
    }
  }, [contact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email) {
      toast({
        title: 'Erreur',
        description: 'L\'email est obligatoire',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateContact.mutateAsync({
        id: contact.id,
        email: formData.email.toLowerCase().trim(),
        first_name: formData.first_name.trim() || null,
        last_name: formData.last_name.trim() || null,
        company: formData.company.trim() || null,
        phone: formData.phone.trim() || null,
        notes: formData.notes.trim() || null,
        status: formData.status as any,
        validation_status: formData.validation_status as any,
      });

      toast({
        title: 'Succès',
        description: 'Contact modifié avec succès',
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la modification du contact',
        variant: 'destructive',
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifier le contact</DialogTitle>
          <DialogDescription>
            Modifiez les informations de ce contact.
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="bounced">Bounce</SelectItem>
                  <SelectItem value="unsubscribed">Désabonné</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="validation_status">Validation email</Label>
              <Select value={formData.validation_status} onValueChange={(value) => handleInputChange('validation_status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="valid">Valide</SelectItem>
                  <SelectItem value="invalid">Invalide</SelectItem>
                  <SelectItem value="risky">Risqué</SelectItem>
                  <SelectItem value="unknown">Non vérifié</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              disabled={updateContact.isPending}
            >
              {updateContact.isPending ? 'Modification...' : 'Modifier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
