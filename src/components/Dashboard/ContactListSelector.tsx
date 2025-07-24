import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Users, 
  Search, 
  Plus,
  Mail,
  Filter
} from 'lucide-react';
import { ContactList } from '@/types/database';
import { useContactLists } from '@/hooks/useContactLists';

interface ContactListSelectorProps {
  selectedLists: string[];
  onListsChange: (lists: string[]) => void;
  contactLists: ContactList[];
}

export default function ContactListSelector({ 
  selectedLists, 
  onListsChange, 
  contactLists 
}: ContactListSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  
  const { createContactList } = useContactLists();

  // S'assurer que contactLists est un tableau
  const safeContactLists = contactLists || [];

  const filteredLists = safeContactLists.filter(list =>
    list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (list.description && list.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleListToggle = (listId: string) => {
    if (selectedLists.includes(listId)) {
      onListsChange(selectedLists.filter(id => id !== listId));
    } else {
      onListsChange([...selectedLists, listId]);
    }
  };

  const handleCreateList = async () => {
    if (newListName.trim()) {
      try {
        await createContactList.mutateAsync({
          name: newListName,
          description: newListDescription || null,
        });
        setNewListName('');
        setNewListDescription('');
        setShowCreateForm(false);
      } catch (error) {
        console.error('Error creating contact list:', error);
      }
    }
  };

  const totalContacts = safeContactLists
    .filter(list => selectedLists.includes(list.id))
    .reduce((sum, list) => sum + list.total_contacts, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Sélection des destinataires</span>
            </CardTitle>
            <Badge variant="secondary">
              {selectedLists.length} liste(s) sélectionnée(s) • {totalContacts.toLocaleString()} contacts
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recherche */}
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher une liste..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle liste
            </Button>
          </div>

          {/* Formulaire de création */}
          {showCreateForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Créer une nouvelle liste</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="newListName">Nom de la liste</Label>
                  <Input
                    id="newListName"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="Ex: Clients VIP"
                  />
                </div>
                <div>
                  <Label htmlFor="newListDescription">Description (optionnel)</Label>
                  <Input
                    id="newListDescription"
                    value={newListDescription}
                    onChange={(e) => setNewListDescription(e.target.value)}
                    placeholder="Description de la liste"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleCreateList} disabled={!newListName.trim()}>
                    Créer
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewListName('');
                      setNewListDescription('');
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Liste des listes de contacts */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredLists.map((list) => (
              <div
                key={list.id}
                className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50"
              >
                <Checkbox
                  checked={selectedLists.includes(list.id)}
                  onCheckedChange={() => handleListToggle(list.id)}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{list.name}</h4>
                      {list.description && (
                        <p className="text-sm text-gray-600">{list.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <Mail className="h-4 w-4" />
                        <span>{list.total_contacts.toLocaleString()} contacts</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        Créé le {new Date(list.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredLists.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'Aucune liste trouvée' : 'Aucune liste de contacts disponible'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Résumé de la sélection */}
      {selectedLists.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Résumé de l'envoi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Listes sélectionnées:</span>
                <span className="font-medium">{selectedLists.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total de contacts:</span>
                <span className="font-medium">{totalContacts.toLocaleString()}</span>
              </div>
              <div className="text-sm text-gray-600 mt-4">
                <strong>Note:</strong> Les contacts présents dans plusieurs listes ne recevront l'email qu'une seule fois.
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
