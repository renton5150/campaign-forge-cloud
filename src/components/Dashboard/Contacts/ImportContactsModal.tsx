import { useState } from 'react';
import { Upload, FileText, Check, X, AlertCircle } from 'lucide-react';
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
import { useContactLists } from '@/hooks/useContactLists';
import { useToast } from '@/hooks/use-toast';

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

export default function ImportContactsModal({ open, onOpenChange, targetListId }: ImportContactsModalProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'importing' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [selectedList, setSelectedList] = useState(targetListId || '');
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<any>(null);

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

    if (!selectedFile.name.match(/\.(csv|xlsx)$/i)) {
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
    // Simulation de parsing - en production, vous utiliseriez une vraie librairie CSV/Excel
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      toast({
        title: 'Fichier vide',
        description: 'Le fichier sélectionné ne contient aucune donnée',
        variant: 'destructive',
      });
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
    const rows = lines.slice(1, 6).map(line => 
      line.split(',').map(cell => cell.trim().replace(/['"]/g, ''))
    );

    setPreview({
      headers,
      rows,
      totalRows: lines.length - 1
    });

    // Auto-mapping intelligent
    const autoMapping: ColumnMapping = {};
    headers.forEach((header, index) => {
      const lowerHeader = header.toLowerCase();
      if (lowerHeader.includes('email') || lowerHeader.includes('e-mail')) {
        autoMapping[index] = 'email';
      } else if (lowerHeader.includes('prénom') || lowerHeader.includes('prenom') || lowerHeader.includes('first')) {
        autoMapping[index] = 'first_name';
      } else if (lowerHeader.includes('nom') && !lowerHeader.includes('prénom') || lowerHeader.includes('last')) {
        autoMapping[index] = 'last_name';
      } else if (lowerHeader.includes('entreprise') || lowerHeader.includes('company') || lowerHeader.includes('société')) {
        autoMapping[index] = 'company';
      } else if (lowerHeader.includes('téléphone') || lowerHeader.includes('phone') || lowerHeader.includes('tel')) {
        autoMapping[index] = 'phone';
      } else if (lowerHeader.includes('note')) {
        autoMapping[index] = 'notes';
      }
    });

    setMapping(autoMapping);
    setStep('mapping');
  };

  const handleMappingChange = (columnIndex: string, field: string) => {
    setMapping(prev => ({
      ...prev,
      [columnIndex]: field
    }));
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
  };

  const closeModal = () => {
    resetImport();
    onOpenChange(false);
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
                  Formats supportés : CSV, Excel (.xlsx)
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
                          accept=".csv,.xlsx"
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
                        <Label className="font-medium">{header}</Label>
                        <div className="text-sm text-muted-foreground">
                          Ex: {preview.rows[0]?.[index] || 'N/A'}
                        </div>
                      </div>
                      <div className="w-1/3">
                        <Select 
                          value={mapping[index] || ''} 
                          onValueChange={(value) => handleMappingChange(String(index), value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Ignorer cette colonne" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ignore">Ignorer</SelectItem>
                            {systemFields.map((field) => (
                              <SelectItem key={field} value={field}>
                                {field === 'email' ? 'Email *' : 
                                 field === 'first_name' ? 'Prénom' :
                                 field === 'last_name' ? 'Nom' :
                                 field === 'company' ? 'Entreprise' :
                                 field === 'phone' ? 'Téléphone' :
                                 field === 'notes' ? 'Notes' : field}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-1/3">
                        {mapping[index] === 'email' && (
                          <Badge className="bg-green-100 text-green-800">Obligatoire</Badge>
                        )}
                        {mapping[index] && mapping[index] !== 'email' && (
                          <Badge variant="outline">Optionnel</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Aperçu des données</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <div className="grid grid-cols-5 gap-2 font-medium border-b pb-2 mb-2">
                    {preview.headers.slice(0, 5).map((header, index) => (
                      <div key={index}>{header}</div>
                    ))}
                  </div>
                  {preview.rows.map((row, rowIndex) => (
                    <div key={rowIndex} className="grid grid-cols-5 gap-2 py-1">
                      {row.slice(0, 5).map((cell, cellIndex) => (
                        <div key={cellIndex} className="text-muted-foreground truncate">
                          {cell || '-'}
                        </div>
                      ))}
                    </div>
                  ))}
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
