import { useState } from 'react';
import { Upload, FileText, Check, X, AlertCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { useContactLists } from '@/hooks/useContactLists';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface ImportContactsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetListId?: string;
}

interface ImportPreview {
  headers: string[];
  rows: any[][];
  totalRows: number;
}

interface ColumnMapping {
  [key: string]: string;
}

interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean';
}

export default function ImportContactsModal({ open, onOpenChange, targetListId }: ImportContactsModalProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'importing' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [selectedList, setSelectedList] = useState(targetListId || '');
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<any>(null);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showCreateField, setShowCreateField] = useState<string | null>(null);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'date' | 'boolean'>('text');

  const { contactLists } = useContactLists();
  const { toast } = useToast();

  // Ensure contactLists is always an array
  const safeContactLists = Array.isArray(contactLists) ? contactLists : [];

  const requiredFields = ['email'];
  const optionalFields = ['first_name', 'last_name', 'company', 'phone', 'notes'];
  const systemFields = ['email', 'first_name', 'last_name', 'company', 'phone', 'notes'];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(csv|xlsx|xls)$/i)) {
      toast({
        title: 'Format non supporté',
        description: 'Veuillez sélectionner un fichier CSV ou Excel',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);
    parseFile(selectedFile);
  };

  const parseFile = async (file: File) => {
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      if (extension === 'csv') {
        const text = await file.text();
        
        Papa.parse(text, {
          complete: (results) => {
            if (results.errors.length > 0) {
              toast({
                title: 'Erreur de parsing',
                description: 'Erreur lors de la lecture du fichier CSV',
                variant: 'destructive',
              });
              return;
            }

            const data = results.data as string[][];
            if (data.length === 0) {
              toast({
                title: 'Fichier vide',
                description: 'Le fichier sélectionné ne contient aucune donnée',
                variant: 'destructive',
              });
              return;
            }

            const headers = data[0];
            const rows = data.slice(1, Math.min(6, data.length)).filter(row => row.some(cell => cell.trim()));

            setPreview({
              headers,
              rows,
              totalRows: data.length - 1
            });

            autoMapColumns(headers);
          },
          header: false,
          skipEmptyLines: true,
          encoding: 'UTF-8'
        });
      } else if (extension === 'xlsx' || extension === 'xls') {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false }) as string[][];

        if (data.length === 0) {
          toast({
            title: 'Fichier vide',
            description: 'Le fichier sélectionné ne contient aucune donnée',
            variant: 'destructive',
          });
          return;
        }

        const headers = data[0];
        const rows = data.slice(1, Math.min(6, data.length)).filter(row => row.some(cell => cell && cell.toString().trim()));

        setPreview({
          headers,
          rows,
          totalRows: data.length - 1
        });

        autoMapColumns(headers);
      }
    } catch (error) {
      console.error('Erreur lors du parsing du fichier:', error);
      toast({
        title: 'Erreur de parsing',
        description: 'Impossible de lire le fichier. Vérifiez le format.',
        variant: 'destructive',
      });
    }
  };

  const autoMapColumns = (headers: string[]) => {
    const autoMapping: ColumnMapping = {};
    
    headers.forEach((header, index) => {
      if (!header) return;
      
      const lowerHeader = header.toLowerCase().trim();
      
      if (lowerHeader.includes('email') || lowerHeader.includes('e-mail') || lowerHeader.includes('mail')) {
        autoMapping[index] = 'email';
      } else if (lowerHeader.includes('prénom') || lowerHeader.includes('prenom') || lowerHeader.includes('first') || lowerHeader.includes('firstname')) {
        autoMapping[index] = 'first_name';
      } else if ((lowerHeader.includes('nom') && !lowerHeader.includes('prénom') && !lowerHeader.includes('prenom')) || lowerHeader.includes('last') || lowerHeader.includes('lastname')) {
        autoMapping[index] = 'last_name';
      } else if (lowerHeader.includes('entreprise') || lowerHeader.includes('company') || lowerHeader.includes('société') || lowerHeader.includes('societe')) {
        autoMapping[index] = 'company';
      } else if (lowerHeader.includes('téléphone') || lowerHeader.includes('telephone') || lowerHeader.includes('phone') || lowerHeader.includes('tel')) {
        autoMapping[index] = 'phone';
      } else if (lowerHeader.includes('note') || lowerHeader.includes('commentaire') || lowerHeader.includes('comment')) {
        autoMapping[index] = 'notes';
      } else {
        // Set unmapped columns to 'ignore' by default
        autoMapping[index] = 'ignore';
      }
    });

    setMapping(autoMapping);
    setStep('mapping');
  };

  const handleMappingChange = (columnIndex: string, field: string) => {
    if (field === 'create_new') {
      setShowCreateField(columnIndex);
      return;
    }
    
    setMapping(prev => ({
      ...prev,
      [columnIndex]: field
    }));
  };

  const handleCreateCustomField = () => {
    if (!newFieldName.trim()) {
      toast({
        title: 'Erreur',
        description: 'Le nom du champ est obligatoire',
        variant: 'destructive',
      });
      return;
    }

    const fieldId = `custom_${Date.now()}`;
    const newField: CustomField = {
      id: fieldId,
      name: newFieldName,
      type: newFieldType
    };

    setCustomFields(prev => [...prev, newField]);
    
    if (showCreateField) {
      setMapping(prev => ({
        ...prev,
        [showCreateField]: fieldId
      }));
    }

    setNewFieldName('');
    setNewFieldType('text');
    setShowCreateField(null);

    toast({
      title: 'Champ créé',
      description: `Le champ "${newFieldName}" a été créé avec succès`,
    });
  };

  const handleCancelCreateField = () => {
    setShowCreateField(null);
    setNewFieldName('');
    setNewFieldType('text');
  };

  const validateMapping = () => {
    const mappedFields = Object.values(mapping);
    const hasEmail = mappedFields.includes('email');
    
    if (!hasEmail) {
      toast({
        title: 'Mapping incomplet',
        description: 'Vous devez mapper au moins la colonne Email',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const startImport = async () => {
    if (!validateMapping() || !selectedList) return;

    setStep('importing');
    setImportProgress(0);

    // Simulation d'import - en production, vous feriez des appels API
    const totalSteps = 100;
    for (let i = 0; i <= totalSteps; i += 10) {
      setImportProgress(i);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Résultats simulés
    setImportResults({
      total: preview?.totalRows || 0,
      successful: Math.floor((preview?.totalRows || 0) * 0.85),
      errors: Math.floor((preview?.totalRows || 0) * 0.1),
      duplicates: Math.floor((preview?.totalRows || 0) * 0.05),
    });

    setStep('complete');
  };

  const resetImport = () => {
    setStep('upload');
    setFile(null);
    setPreview(null);
    setMapping({});
    setImportProgress(0);
    setImportResults(null);
    setCustomFields([]);
    setShowCreateField(null);
    setNewFieldName('');
    setNewFieldType('text');
  };

  const closeModal = () => {
    resetImport();
    onOpenChange(false);
  };

  const getFieldDisplayName = (field: string) => {
    const customField = customFields.find(f => f.id === field);
    if (customField) return customField.name;
    
    switch (field) {
      case 'email': return 'Email *';
      case 'first_name': return 'Prénom';
      case 'last_name': return 'Nom';
      case 'company': return 'Entreprise';
      case 'phone': return 'Téléphone';
      case 'notes': return 'Notes';
      default: return field;
    }
  };

  const getSelectDisplayValue = (columnIndex: string) => {
    const mappedField = mapping[columnIndex];
    
    // Handle the create_new case specifically
    if (mappedField === 'create_new') {
      return "Créer un nouveau champ";
    }
    
    // Always return a valid string, default to ignore if undefined
    if (!mappedField || mappedField === 'ignore') return "Ignorer cette colonne";
    
    const customField = customFields.find(f => f.id === mappedField);
    if (customField) return customField.name;
    
    return getFieldDisplayName(mappedField);
  };

  return (
    <Dialog open={open} onOpenChange={closeModal}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer des contacts</DialogTitle>
          <DialogDescription>
            Importez vos contacts depuis un fichier CSV ou Excel
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sélectionner un fichier</CardTitle>
                <CardDescription>
                  Formats supportés : CSV, Excel (.xlsx, .xls)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <div className="space-y-2">
                    <p className="text-lg font-medium">Glissez votre fichier ici</p>
                    <p className="text-sm text-muted-foreground">ou</p>
                    <Button variant="outline" asChild>
                      <label>
                        Parcourir les fichiers
                        <input
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </label>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sélectionner la liste de destination</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedList} onValueChange={setSelectedList}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une liste de contacts" />
                  </SelectTrigger>
                  <SelectContent>
                    {safeContactLists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.name} ({list.total_contacts || 0} contacts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'mapping' && preview && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mapping des colonnes</CardTitle>
                <CardDescription>
                  Associez les colonnes de votre fichier aux champs de contact
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {preview.headers.map((header, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-1/3">
                        <Label className="font-medium">{header || `Colonne ${index + 1}`}</Label>
                        <div className="text-sm text-muted-foreground">
                          Ex: {preview.rows[0]?.[index] || 'N/A'}
                        </div>
                      </div>
                      <div className="w-1/3">
                        <Select 
                          value={mapping[index] || 'ignore'} 
                          onValueChange={(value) => handleMappingChange(String(index), value)}
                        >
                          <SelectTrigger>
                            <SelectValue>
                              {getSelectDisplayValue(String(index))}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ignore">Ignorer cette colonne</SelectItem>
                            {systemFields.map((field) => (
                              <SelectItem key={field} value={field}>
                                {getFieldDisplayName(field)}
                              </SelectItem>
                            ))}
                            {customFields.map((field) => (
                              <SelectItem key={field.id} value={field.id}>
                                {field.name} (personnalisé)
                              </SelectItem>
                            ))}
                            <SelectItem value="create_new">
                              <div className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Créer un nouveau champ
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-1/3">
                        {mapping[index] === 'email' && (
                          <Badge className="bg-green-100 text-green-800">Obligatoire</Badge>
                        )}
                        {mapping[index] && mapping[index] !== 'email' && mapping[index] !== 'ignore' && mapping[index] !== 'create_new' && (
                          <Badge variant="outline">
                            {customFields.find(f => f.id === mapping[index]) ? 'Personnalisé' : 'Optionnel'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {showCreateField && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-lg">Créer un nouveau champ</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Label>Nom du champ</Label>
                          <Input
                            value={newFieldName}
                            onChange={(e) => setNewFieldName(e.target.value)}
                            placeholder="Ex: Titre du poste"
                          />
                        </div>
                        <div>
                          <Label>Type de champ</Label>
                          <Select value={newFieldType} onValueChange={(value: any) => setNewFieldType(value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Texte</SelectItem>
                              <SelectItem value="number">Nombre</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="boolean">Oui/Non</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleCreateCustomField}>
                            Créer le champ
                          </Button>
                          <Button variant="outline" onClick={handleCancelCreateField}>
                            Annuler
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Aperçu des données</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        {preview.headers.slice(0, 6).map((header, index) => (
                          <th key={index} className="text-left p-2 font-medium">
                            {header || `Colonne ${index + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.slice(0, 5).map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b">
                          {row.slice(0, 6).map((cell, cellIndex) => (
                            <td key={cellIndex} className="p-2 text-muted-foreground">
                              {cell || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  Total : {preview.totalRows} lignes à importer
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Retour
              </Button>
              <Button 
                onClick={startImport}
                disabled={!selectedList || !Object.values(mapping).includes('email')}
              >
                Commencer l'import
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Import en cours...</CardTitle>
                <CardDescription>
                  Veuillez patienter pendant l'import de vos contacts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Progress value={importProgress} className="w-full" />
                  <div className="text-center text-sm text-muted-foreground">
                    {importProgress}% complété
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'complete' && importResults && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  Import terminé
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {importResults.total}
                    </div>
                    <div className="text-sm text-blue-600">Total traité</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {importResults.successful}
                    </div>
                    <div className="text-sm text-green-600">Succès</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {importResults.errors}
                    </div>
                    <div className="text-sm text-red-600">Erreurs</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {importResults.duplicates}
                    </div>
                    <div className="text-sm text-orange-600">Doublons</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button onClick={closeModal}>
                Fermer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
