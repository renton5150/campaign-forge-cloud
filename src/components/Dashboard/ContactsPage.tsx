import { useState } from 'react';
import { Plus, Upload, Download, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useContacts } from '@/hooks/useContacts';
import { useContactLists } from '@/hooks/useContactLists';
import ContactsTable from './Contacts/ContactsTable';
import CreateContactModal from './Contacts/CreateContactModal';
import ImportContactsModal from './Contacts/ImportContactsModal';

export default function ContactsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedList, setSelectedList] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const { contacts, isLoading } = useContacts(selectedList || undefined, searchTerm, statusFilter);
  const { contactLists } = useContactLists();

  // Calculer les métriques
  const totalContacts = contacts.length;
  const activeContacts = contacts.filter(c => c.status === 'active').length;
  const bouncedContacts = contacts.filter(c => c.status === 'bounced').length;
  const unsubscribedContacts = contacts.filter(c => c.status === 'unsubscribed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Gestion des contacts</h1>
          <p className="text-muted-foreground">
            Gérez vos contacts et listes de diffusion
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importer
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau contact
          </Button>
        </div>
      </div>

      {/* Métriques */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContacts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeContacts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{bouncedContacts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Désabonnés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{unsubscribedContacts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres et recherche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, email ou entreprise..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={selectedList} onValueChange={setSelectedList}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Toutes les listes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toutes les listes</SelectItem>
                {contactLists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name} ({list.total_contacts})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tous statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous statuts</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="bounced">Bounce</SelectItem>
                <SelectItem value="unsubscribed">Désabonné</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table des contacts */}
      <Card>
        <CardHeader>
          <CardTitle>Contacts</CardTitle>
          <CardDescription>
            {totalContacts} contact{totalContacts > 1 ? 's' : ''} trouvé{totalContacts > 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContactsTable 
            contacts={contacts} 
            isLoading={isLoading}
            selectedList={selectedList}
          />
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateContactModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal}
      />
      <ImportContactsModal 
        open={showImportModal} 
        onOpenChange={setShowImportModal}
        targetListId={selectedList}
      />
    </div>
  );
}