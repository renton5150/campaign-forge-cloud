
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Mail, Shield, AlertCircle } from 'lucide-react';
import { useContactLists } from '@/hooks/useContactLists';
import BlacklistListSelector from '../BlacklistListSelector';

interface CampaignRecipientsProps {
  formData: any;
  updateFormData: (updates: any) => void;
}

export default function CampaignRecipients({ formData, updateFormData }: CampaignRecipientsProps) {
  const { contactLists, isLoading } = useContactLists();
  const selectedBlacklists: string[] = formData.selected_blacklists || [];
  const handleBlacklistChange = (ids: string[]) => updateFormData({ selected_blacklists: ids });
  const handleListToggle = (listId: string) => {
    const currentLists = formData.selected_lists || [];
    const newLists = currentLists.includes(listId)
      ? currentLists.filter((id: string) => id !== listId)
      : [...currentLists, listId];
    
    updateFormData({ selected_lists: newLists });
  };

  const getTotalContacts = () => {
    if (!contactLists || !formData.selected_lists) return 0;
    return formData.selected_lists.reduce((total: number, listId: string) => {
      const list = contactLists.find(l => l.id === listId);
      return total + (list?.total_contacts || 0);
    }, 0);
  };

  const getSelectedLists = () => {
    if (!contactLists || !formData.selected_lists) return [];
    return contactLists.filter(list => formData.selected_lists.includes(list.id));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!contactLists || contactLists.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Aucune liste de contacts trouvée. Vous devez d'abord créer des listes de contacts.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold mb-2">Sélection des destinataires</h2>
        <p className="text-gray-600">Choisissez les listes de contacts qui recevront votre campagne</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Listes de contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {contactLists.map((list) => (
                <div
                  key={list.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    formData.selected_lists?.includes(list.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleListToggle(list.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        formData.selected_lists?.includes(list.id)
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {formData.selected_lists?.includes(list.id) && (
                          <div className="w-2 h-2 bg-white rounded-sm"></div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{list.name}</div>
                        <div className="text-sm text-gray-500">{list.description}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">
                        {list.total_contacts} contacts
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Résumé des destinataires
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {getTotalContacts().toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">
                    contacts sélectionnés
                  </div>
                </div>

                {getSelectedLists().length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Listes sélectionnées :</h4>
                    <div className="space-y-2">
                      {getSelectedLists().map((list) => (
                        <div key={list.id} className="flex items-center justify-between text-sm">
                          <span>{list.name}</span>
                          <Badge variant="outline">{list.total_contacts}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Blacklist (optionnel)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BlacklistListSelector
                selectedListIds={selectedBlacklists}
                onSelectionChange={handleBlacklistChange}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {formData.selected_lists?.length > 0 && (
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">✅ Prêt pour l'envoi</h3>
          <p className="text-sm text-gray-700">
            {getTotalContacts().toLocaleString()} contacts recevront votre campagne.
            Vous pouvez maintenant passer à l'étape suivante pour configurer le contenu.
          </p>
        </div>
      )}
    </div>
  );
}
