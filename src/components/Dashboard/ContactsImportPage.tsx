import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, CheckCircle, AlertCircle, Download } from 'lucide-react';

const ContactsImportPage = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      // Simulation d'upload
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          setIsUploading(false);
        }
      }, 200);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import de contacts</h1>
          <p className="text-gray-600">Importez vos contacts depuis un fichier CSV ou Excel</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Télécharger modèle CSV
        </Button>
      </div>

      {/* Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Importer un fichier</CardTitle>
            <CardDescription>
              Formats supportés : CSV, Excel (.xlsx, .xls)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    Glissez votre fichier ici ou cliquez pour parcourir
                  </span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                  />
                </label>
                <p className="mt-2 text-xs text-gray-500">
                  Taille maximale : 10MB
                </p>
              </div>
            </div>

            {isUploading && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Upload en cours...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Format requis</p>
                <p className="text-sm text-gray-600">Première ligne = en-têtes de colonnes</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Colonnes recommandées</p>
                <p className="text-sm text-gray-600">Email, Prénom, Nom, Entreprise, Téléphone</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium">Gestion des doublons</p>
                <p className="text-sm text-gray-600">Les emails existants seront mis à jour</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Imports */}
      <Card>
        <CardHeader>
          <CardTitle>Imports récents</CardTitle>
          <CardDescription>Historique de vos derniers imports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Example import history */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-medium">contacts_janvier_2024.csv</p>
                  <p className="text-sm text-gray-600">Importé le 15 janvier 2024</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium">1,250 contacts</p>
                  <div className="flex space-x-2">
                    <Badge variant="outline" className="text-green-600">
                      1,200 ajoutés
                    </Badge>
                    <Badge variant="outline" className="text-orange-600">
                      50 doublons
                    </Badge>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800">Terminé</Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-medium">prospects_decembre_2023.xlsx</p>
                  <p className="text-sm text-gray-600">Importé le 28 décembre 2023</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium">890 contacts</p>
                  <div className="flex space-x-2">
                    <Badge variant="outline" className="text-green-600">
                      875 ajoutés
                    </Badge>
                    <Badge variant="outline" className="text-red-600">
                      15 erreurs
                    </Badge>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800">Terminé</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactsImportPage;