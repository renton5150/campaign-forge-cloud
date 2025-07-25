
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Search, Eye, EyeOff } from 'lucide-react';
import { PersonalizationVariable, getAllVariables, generatePreview } from '@/utils/emailPersonalization';

interface PersonalizationPanelProps {
  onInsertVariable: (variable: string) => void;
  previewText?: string;
  onPreviewChange?: (preview: string) => void;
  availableContacts?: any[];
  className?: string;
}

export default function PersonalizationPanel({
  onInsertVariable,
  previewText = '',
  onPreviewChange,
  availableContacts = [],
  className = ''
}: PersonalizationPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  
  const variables = getAllVariables(availableContacts);
  
  const filteredVariables = variables.filter(variable =>
    variable.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    variable.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const standardVariables = filteredVariables.filter(v => v.category === 'standard');
  const customVariables = filteredVariables.filter(v => v.category === 'custom');

  const handleInsertVariable = (variable: PersonalizationVariable) => {
    const variableText = `{{${variable.key}}}`;
    onInsertVariable(variableText);
  };

  const handleCopyVariable = (variable: PersonalizationVariable) => {
    const variableText = `{{${variable.key}}}`;
    navigator.clipboard.writeText(variableText);
  };

  const previewContent = showPreview && previewText ? 
    generatePreview(previewText) : previewText;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Personnalisation</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPreview ? 'Masquer' : 'Aperçu'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="search">Rechercher une variable</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="search"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {showPreview && (
          <div className="p-3 bg-gray-50 rounded-lg border">
            <Label className="text-sm font-medium text-gray-700">Aperçu :</Label>
            <div className="mt-2 text-sm">
              {previewContent || 'Aucun contenu à prévisualiser'}
            </div>
          </div>
        )}

        <Tabs defaultValue="standard" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="standard">Standard</TabsTrigger>
            <TabsTrigger value="custom">Personnalisé</TabsTrigger>
          </TabsList>
          
          <TabsContent value="standard" className="space-y-2">
            {standardVariables.length > 0 ? (
              standardVariables.map((variable) => (
                <div key={variable.key} className="p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{variable.label}</span>
                        <Badge variant="secondary" className="text-xs">
                          {variable.key}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{variable.description}</p>
                      {variable.example && (
                        <p className="text-xs text-gray-500 mt-1">
                          Exemple: {variable.example}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyVariable(variable)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleInsertVariable(variable)}
                      >
                        Insérer
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">
                Aucune variable standard trouvée
              </p>
            )}
          </TabsContent>
          
          <TabsContent value="custom" className="space-y-2">
            {customVariables.length > 0 ? (
              customVariables.map((variable) => (
                <div key={variable.key} className="p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{variable.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {variable.key}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{variable.description}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyVariable(variable)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleInsertVariable(variable)}
                      >
                        Insérer
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">
                Aucun champ personnalisé disponible
              </p>
            )}
          </TabsContent>
        </Tabs>

        <div className="pt-4 border-t">
          <p className="text-xs text-gray-500">
            💡 Utilisez les variables sous la forme {"{{"} VARIABLE {"}}"} dans votre contenu.
            Elles seront automatiquement remplacées par les données du contact lors de l'envoi.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
