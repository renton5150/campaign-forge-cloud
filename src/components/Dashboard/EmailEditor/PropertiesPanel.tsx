
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload } from 'lucide-react';
import { EmailComponent } from './types';

interface PropertiesPanelProps {
  selectedComponent: EmailComponent | null;
  onUpdateComponent: (id: string, updates: Partial<EmailComponent>) => void;
  globalStyles: Record<string, any>;
  onUpdateGlobalStyles: (styles: Record<string, any>) => void;
  variables: Record<string, string>;
  onUpdateVariables: (variables: Record<string, string>) => void;
}

export default function PropertiesPanel({
  selectedComponent,
  onUpdateComponent,
  globalStyles,
  onUpdateGlobalStyles,
  variables,
  onUpdateVariables
}: PropertiesPanelProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedComponent) {
      setImageFile(file);
      
      // Créer une URL temporaire pour l'aperçu
      const url = URL.createObjectURL(file);
      onUpdateComponent(selectedComponent.id, {
        props: { ...selectedComponent.props, src: url }
      });
    }
  };

  const renderComponentProperties = () => {
    if (!selectedComponent) return null;

    switch (selectedComponent.type) {
      case 'header':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={selectedComponent.props.title || ''}
                onChange={(e) => onUpdateComponent(selectedComponent.id, {
                  props: { ...selectedComponent.props, title: e.target.value }
                })}
              />
            </div>
            <div>
              <Label htmlFor="subtitle">Sous-titre</Label>
              <Input
                id="subtitle"
                value={selectedComponent.props.subtitle || ''}
                onChange={(e) => onUpdateComponent(selectedComponent.id, {
                  props: { ...selectedComponent.props, subtitle: e.target.value }
                })}
              />
            </div>
          </div>
        );

      case 'text':
        return (
          <div>
            <Label htmlFor="content">Contenu</Label>
            <Textarea
              id="content"
              value={selectedComponent.props.content || ''}
              onChange={(e) => onUpdateComponent(selectedComponent.id, {
                props: { ...selectedComponent.props, content: e.target.value }
              })}
              rows={8}
            />
          </div>
        );

      case 'image':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="image-upload">Image</Label>
              <div className="flex space-x-2">
                <Input
                  value={selectedComponent.props.src || ''}
                  onChange={(e) => onUpdateComponent(selectedComponent.id, {
                    props: { ...selectedComponent.props, src: e.target.value }
                  })}
                  placeholder="URL de l'image"
                />
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="alt">Texte alternatif</Label>
              <Input
                id="alt"
                value={selectedComponent.props.alt || ''}
                onChange={(e) => onUpdateComponent(selectedComponent.id, {
                  props: { ...selectedComponent.props, alt: e.target.value }
                })}
              />
            </div>
            <div>
              <Label htmlFor="width">Largeur</Label>
              <Select
                value={selectedComponent.props.width || '100%'}
                onValueChange={(value) => onUpdateComponent(selectedComponent.id, {
                  props: { ...selectedComponent.props, width: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100%">100%</SelectItem>
                  <SelectItem value="75%">75%</SelectItem>
                  <SelectItem value="50%">50%</SelectItem>
                  <SelectItem value="300px">300px</SelectItem>
                  <SelectItem value="200px">200px</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'button':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="text">Texte du bouton</Label>
              <Input
                id="text"
                value={selectedComponent.props.text || ''}
                onChange={(e) => onUpdateComponent(selectedComponent.id, {
                  props: { ...selectedComponent.props, text: e.target.value }
                })}
              />
            </div>
            <div>
              <Label htmlFor="href">Lien</Label>
              <Input
                id="href"
                value={selectedComponent.props.href || ''}
                onChange={(e) => onUpdateComponent(selectedComponent.id, {
                  props: { ...selectedComponent.props, href: e.target.value }
                })}
                placeholder="https://"
              />
            </div>
            <div>
              <Label htmlFor="backgroundColor">Couleur de fond</Label>
              <Input
                id="backgroundColor"
                type="color"
                value={selectedComponent.props.backgroundColor || '#007bff'}
                onChange={(e) => onUpdateComponent(selectedComponent.id, {
                  props: { ...selectedComponent.props, backgroundColor: e.target.value }
                })}
              />
            </div>
            <div>
              <Label htmlFor="textColor">Couleur du texte</Label>
              <Input
                id="textColor"
                type="color"
                value={selectedComponent.props.textColor || '#ffffff'}
                onChange={(e) => onUpdateComponent(selectedComponent.id, {
                  props: { ...selectedComponent.props, textColor: e.target.value }
                })}
              />
            </div>
          </div>
        );

      case 'divider':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="height">Épaisseur</Label>
              <Select
                value={selectedComponent.props.height || '1px'}
                onValueChange={(value) => onUpdateComponent(selectedComponent.id, {
                  props: { ...selectedComponent.props, height: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1px">1px</SelectItem>
                  <SelectItem value="2px">2px</SelectItem>
                  <SelectItem value="3px">3px</SelectItem>
                  <SelectItem value="5px">5px</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="color">Couleur</Label>
              <Input
                id="color"
                type="color"
                value={selectedComponent.props.color || '#e5e5e5'}
                onChange={(e) => onUpdateComponent(selectedComponent.id, {
                  props: { ...selectedComponent.props, color: e.target.value }
                })}
              />
            </div>
          </div>
        );

      case 'footer':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="companyName">Nom de l'entreprise</Label>
              <Input
                id="companyName"
                value={selectedComponent.props.companyName || ''}
                onChange={(e) => onUpdateComponent(selectedComponent.id, {
                  props: { ...selectedComponent.props, companyName: e.target.value }
                })}
              />
            </div>
            <div>
              <Label htmlFor="address">Adresse</Label>
              <Textarea
                id="address"
                value={selectedComponent.props.address || ''}
                onChange={(e) => onUpdateComponent(selectedComponent.id, {
                  props: { ...selectedComponent.props, address: e.target.value }
                })}
                rows={3}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderStyleProperties = () => {
    if (!selectedComponent) return null;

    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="textAlign">Alignement</Label>
          <Select
            value={selectedComponent.styles.textAlign || 'left'}
            onValueChange={(value) => onUpdateComponent(selectedComponent.id, {
              styles: { ...selectedComponent.styles, textAlign: value }
            })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Gauche</SelectItem>
              <SelectItem value="center">Centre</SelectItem>
              <SelectItem value="right">Droite</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="padding">Espacement interne</Label>
          <Input
            id="padding"
            value={selectedComponent.styles.padding || ''}
            onChange={(e) => onUpdateComponent(selectedComponent.id, {
              styles: { ...selectedComponent.styles, padding: e.target.value }
            })}
            placeholder="ex: 20px"
          />
        </div>
        <div>
          <Label htmlFor="backgroundColor">Couleur de fond</Label>
          <Input
            id="backgroundColor"
            type="color"
            value={selectedComponent.styles.backgroundColor || '#ffffff'}
            onChange={(e) => onUpdateComponent(selectedComponent.id, {
              styles: { ...selectedComponent.styles, backgroundColor: e.target.value }
            })}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 h-full overflow-y-auto">
      <Tabs defaultValue="component" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="component">Composant</TabsTrigger>
          <TabsTrigger value="style">Style</TabsTrigger>
          <TabsTrigger value="global">Global</TabsTrigger>
        </TabsList>

        <TabsContent value="component" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {selectedComponent ? `Propriétés - ${selectedComponent.type}` : 'Aucun composant sélectionné'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedComponent ? renderComponentProperties() : (
                <p className="text-sm text-gray-500">Sélectionnez un composant pour voir ses propriétés</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="style" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Styles</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedComponent ? renderStyleProperties() : (
                <p className="text-sm text-gray-500">Sélectionnez un composant pour modifier son style</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="global" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Styles globaux</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="globalBg">Couleur de fond</Label>
                <Input
                  id="globalBg"
                  type="color"
                  value={globalStyles.backgroundColor}
                  onChange={(e) => onUpdateGlobalStyles({ backgroundColor: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="fontFamily">Police</Label>
                <Select
                  value={globalStyles.fontFamily}
                  onValueChange={(value) => onUpdateGlobalStyles({ fontFamily: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                    <SelectItem value="Georgia, serif">Georgia</SelectItem>
                    <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
                    <SelectItem value="Helvetica, sans-serif">Helvetica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="maxWidth">Largeur maximale</Label>
                <Input
                  id="maxWidth"
                  value={globalStyles.maxWidth}
                  onChange={(e) => onUpdateGlobalStyles({ maxWidth: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Variables de test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(variables).map(([key, value]) => (
                <div key={key}>
                  <Label htmlFor={key} className="text-xs">{key}</Label>
                  <Input
                    id={key}
                    value={value}
                    onChange={(e) => onUpdateVariables({ [key]: e.target.value })}
                    className="text-xs"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
