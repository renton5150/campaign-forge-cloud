
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBlacklistLists } from '@/hooks/useBlacklistLists';
import { Shield, List } from 'lucide-react';

interface BlacklistListSelectorProps {
  selectedListIds: string[];
  onSelectionChange: (listIds: string[]) => void;
}

export default function BlacklistListSelector({ 
  selectedListIds, 
  onSelectionChange 
}: BlacklistListSelectorProps) {
  const { blacklistLists, isLoading } = useBlacklistLists();

  const handleListToggle = (listId: string) => {
    if (selectedListIds.includes(listId)) {
      onSelectionChange(selectedListIds.filter(id => id !== listId));
    } else {
      onSelectionChange([...selectedListIds, listId]);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Listes de blacklist</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-pulse">Chargement des listes...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>Listes de blacklist</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {blacklistLists.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <List className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>Aucune liste de blacklist disponible</p>
            </div>
          ) : (
            <>
              <div className="text-sm text-gray-600 mb-3">
                Sélectionnez les listes de blacklist à appliquer :
              </div>
              {blacklistLists.map((list) => (
                <div key={list.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`blacklist-${list.id}`}
                    checked={selectedListIds.includes(list.id)}
                    onChange={() => handleListToggle(list.id)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor={`blacklist-${list.id}`} className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{list.name}</div>
                        {list.description && (
                          <div className="text-sm text-gray-500">{list.description}</div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{list.type}</Badge>
                        {list.is_active ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </div>
                  </label>
                </div>
              ))}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
