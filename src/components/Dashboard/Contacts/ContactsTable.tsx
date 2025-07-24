
import { useState } from 'react';
import { MoreHorizontal, Mail, Trash2, Edit, Eye } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Contact } from '@/types/database';
import { useContacts } from '@/hooks/useContacts';
import ContactDetailsModal from './ContactDetailsModal';
import EditContactModal from './EditContactModal';

interface ContactsTableProps {
  contacts: Contact[];
  isLoading: boolean;
  selectedList?: string;
  onNavigateToList?: (listId: string) => void;
}

export default function ContactsTable({ contacts, isLoading, selectedList, onNavigateToList }: ContactsTableProps) {
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const { deleteContact } = useContacts();

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContacts(contacts.map(c => c.id));
    } else {
      setSelectedContacts([]);
    }
  };

  const handleSelectContact = (contactId: string, checked: boolean) => {
    if (checked) {
      setSelectedContacts([...selectedContacts, contactId]);
    } else {
      setSelectedContacts(selectedContacts.filter(id => id !== contactId));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Actif</Badge>;
      case 'bounced':
        return <Badge variant="destructive">Bounce</Badge>;
      case 'unsubscribed':
        return <Badge variant="secondary">Désabonné</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getValidationBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return <Badge variant="default" className="bg-green-100 text-green-800">✓</Badge>;
      case 'invalid':
        return <Badge variant="destructive">✗</Badge>;
      case 'risky':
        return <Badge variant="secondary">?</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  const formatEngagementScore = (score: number) => {
    if (score >= 70) return <span className="text-green-600 font-medium">{score}</span>;
    if (score >= 40) return <span className="text-orange-600 font-medium">{score}</span>;
    return <span className="text-red-600 font-medium">{score}</span>;
  };

  const getContactLists = (contact: any) => {
    if (!contact.contact_list_memberships || contact.contact_list_memberships.length === 0) {
      return <span className="text-muted-foreground">Aucune liste</span>;
    }

    const lists = contact.contact_list_memberships
      .map((membership: any) => ({
        id: membership.list_id,
        name: membership.contact_lists?.name
      }))
      .filter((list: any) => list.name);
    
    if (lists.length === 0) {
      return <span className="text-muted-foreground">Aucune liste</span>;
    }

    if (lists.length === 1) {
      return (
        <Badge 
          variant="outline" 
          className="cursor-pointer hover:bg-blue-50"
          onClick={() => onNavigateToList?.(lists[0].id)}
        >
          {lists[0].name}
        </Badge>
      );
    }

    return (
      <div className="flex flex-wrap gap-1">
        <Badge 
          variant="outline"
          className="cursor-pointer hover:bg-blue-50"
          onClick={() => onNavigateToList?.(lists[0].id)}
        >
          {lists[0].name}
        </Badge>
        {lists.length > 1 && (
          <div className="relative group">
            <Badge variant="outline" className="cursor-pointer hover:bg-blue-50">
              +{lists.length - 1}
            </Badge>
            <div className="absolute left-0 top-full mt-1 bg-white border rounded-md shadow-lg p-2 hidden group-hover:block z-10 min-w-max">
              {lists.slice(1).map((list: any, index: number) => (
                <div 
                  key={index}
                  className="px-2 py-1 hover:bg-gray-100 cursor-pointer text-sm"
                  onClick={() => onNavigateToList?.(list.id)}
                >
                  {list.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleViewDetails = (contact: Contact) => {
    setSelectedContact(contact);
    setShowDetailsModal(true);
  };

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    setShowEditModal(true);
  };

  const handleDeleteContact = async (contactId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce contact ?')) {
      await deleteContact.mutateAsync(contactId);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center">Chargement des contacts...</div>;
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedContacts.length === contacts.length && contacts.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Entreprise</TableHead>
              <TableHead>Listes</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Validation</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Ajouté le</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Aucun contact trouvé
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedContacts.includes(contact.id)}
                      onCheckedChange={(checked) => handleSelectContact(contact.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {contact.first_name?.[0]?.toUpperCase() || contact.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {contact.first_name || contact.last_name 
                            ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
                            : 'Sans nom'
                          }
                        </div>
                        {contact.tags && contact.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {contact.tags.slice(0, 2).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {contact.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{contact.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {contact.email}
                    </div>
                  </TableCell>
                  <TableCell>{contact.company || '-'}</TableCell>
                  <TableCell>{getContactLists(contact)}</TableCell>
                  <TableCell>{getStatusBadge(contact.status || 'unknown')}</TableCell>
                  <TableCell>{getValidationBadge(contact.validation_status || 'unknown')}</TableCell>
                  <TableCell>{formatEngagementScore(contact.engagement_score || 0)}</TableCell>
                  <TableCell>
                    {new Date(contact.created_at).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleViewDetails(contact)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Voir détails
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditContact(contact)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteContact(contact.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Actions en lot */}
      {selectedContacts.length > 0 && (
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedContacts.length} contact{selectedContacts.length > 1 ? 's' : ''} sélectionné{selectedContacts.length > 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Déplacer vers liste
              </Button>
              <Button variant="outline" size="sm">
                Modifier le statut
              </Button>
              <Button variant="destructive" size="sm">
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedContact && (
        <>
          <ContactDetailsModal
            contact={selectedContact}
            open={showDetailsModal}
            onOpenChange={setShowDetailsModal}
          />
          <EditContactModal
            contact={selectedContact}
            open={showEditModal}
            onOpenChange={setShowEditModal}
          />
        </>
      )}
    </>
  );
}
