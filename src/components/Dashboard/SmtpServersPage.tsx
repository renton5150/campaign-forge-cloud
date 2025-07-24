import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Settings, Trash2, TestTube } from 'lucide-react';
import { useSmtpServers, SmtpServerFormData, SmtpServerType } from '@/hooks/useSmtpServers';
import { useToast } from '@/hooks/use-toast';

const smtpServerSchema = z.object({
  name: z.string().min(1, 'Le nom est obligatoire'),
  type: z.enum(['smtp', 'sendgrid', 'mailgun', 'amazon_ses']),
  host: z.string().optional(),
  port: z.number().min(25).max(2525).optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  api_key: z.string().optional(),
  domain: z.string().optional(),
  region: z.string().optional(),
  encryption: z.string().optional(),
  from_name: z.string().min(1, 'Le nom expéditeur est obligatoire'),
  from_email: z.string().email('Email invalide'),
  is_active: z.boolean().default(true),
}).refine((data) => {
  // Validation conditionnelle selon le type
  if (data.type === 'smtp') {
    return data.host && data.port && data.username && data.password;
  }
  if (data.type === 'sendgrid') {
    return data.api_key;
  }
  if (data.type === 'mailgun') {
    return data.api_key && data.domain;
  }
  if (data.type === 'amazon_ses') {
    return data.api_key && data.password && data.region;
  }
  return true;
}, {
  message: "Veuillez remplir tous les champs obligatoires pour ce type de serveur",
});

const SmtpServersPage = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<SmtpServer | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const { servers, loading, createServer, updateServer, deleteServer, testSmtpConnection } = useSmtpServers();
  const { toast } = useToast();
  
  const form = useForm<SmtpServerFormData>({
    resolver: zodResolver(smtpServerSchema),
    defaultValues: {
      name: '',
      type: 'smtp',
      host: '',
      port: 587,
      username: '',
      password: '',
      api_key: '',
      domain: '',
      region: '',
      encryption: 'tls',
      from_name: '',
      from_email: '',
      is_active: true,
    },
  });

  const editForm = useForm<SmtpServerFormData>({
    resolver: zodResolver(smtpServerSchema),
    defaultValues: {
      name: '',
      type: 'smtp',
      host: '',
      port: 587,
      username: '',
      password: '',
      api_key: '',
      domain: '',
      region: '',
      encryption: 'tls',
      from_name: '',
      from_email: '',
      is_active: true,
    },
  });

  const selectedType = form.watch('type');
  const selectedEditType = editForm.watch('type');

  const onSubmit = async (data: SmtpServerFormData) => {
    const result = await createServer(data);
    if (result) {
      setIsDialogOpen(false);
      form.reset();
    }
  };

  const onEditSubmit = async (data: SmtpServerFormData) => {
    if (!editingServer) return;
    
    const result = await updateServer(editingServer.id, data);
    if (result) {
      setIsEditDialogOpen(false);
      setEditingServer(null);
      editForm.reset();
    }
  };

  const handleEditServer = (server: SmtpServer) => {
    setEditingServer(server);
    editForm.reset({
      name: server.name,
      type: server.type as SmtpServerType,
      host: server.host || '',
      port: server.port || 587,
      username: server.username || '',
      password: '', // Ne pas pré-remplir le mot de passe pour la sécurité
      api_key: '', // Ne pas pré-remplir l'API key pour la sécurité
      domain: server.domain || '',
      region: server.region || '',
      encryption: server.encryption || 'tls',
      from_name: server.from_name,
      from_email: server.from_email,
      is_active: server.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const handleTestConnection = async () => {
    const formData = form.getValues();
    setTestingConnection(true);
    
    try {
      // Validation des champs requis selon le type
      if (formData.type === 'smtp') {
        if (!formData.host || !formData.port || !formData.username || !formData.password) {
          toast({
            title: "Champs manquants",
            description: "Veuillez remplir tous les champs SMTP obligatoires avant de tester",
            variant: "destructive",
          });
          return;
        }
      } else if (formData.type === 'sendgrid') {
        if (!formData.api_key) {
          toast({
            title: "Champs manquants",
            description: "Veuillez saisir la clé API SendGrid",
            variant: "destructive",
          });
          return;
        }
      } else if (formData.type === 'mailgun') {
        if (!formData.api_key || !formData.domain) {
          toast({
            title: "Champs manquants",
            description: "Veuillez saisir la clé API et le domaine Mailgun",
            variant: "destructive",
          });
          return;
        }
      } else if (formData.type === 'amazon_ses') {
        if (!formData.api_key || !formData.password || !formData.region) {
          toast({
            title: "Champs manquants",
            description: "Veuillez saisir les clés AWS et la région",
            variant: "destructive",
          });
          return;
        }
      }

      const result = await testSmtpConnection(formData);
      
      toast({
        title: "✅ Test réussi",
        description: result.message + (result.details ? ` - ${JSON.stringify(result.details)}` : ''),
      });

    } catch (error: any) {
      console.error('Test connection error:', error);
      toast({
        title: "❌ Test échoué",
        description: error.message || "Erreur lors du test de connexion",
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'sendgrid': return 'SendGrid';
      case 'mailgun': return 'Mailgun';
      case 'smtp': return 'SMTP';
      case 'amazon_ses': return 'Amazon SES';
      default: return type;
    }
  };

  const getTypeVariant = (type: string) => {
    switch (type) {
      case 'sendgrid': return 'default';
      case 'mailgun': return 'secondary';
      case 'amazon_ses': return 'outline';
      case 'smtp': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Serveurs d'envoi</h1>
          <p className="text-muted-foreground">
            Configurez vos serveurs SMTP pour l'envoi d'emails
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un serveur
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ajouter un serveur d'envoi</DialogTitle>
              <DialogDescription>
                Configurez un nouveau serveur pour l'envoi d'emails.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom du serveur</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: SendGrid Production" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner le type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="smtp">SMTP (serveur SMTP classique)</SelectItem>
                            <SelectItem value="sendgrid">SendGrid (API SendGrid)</SelectItem>
                            <SelectItem value="mailgun">Mailgun (API Mailgun)</SelectItem>
                            <SelectItem value="amazon_ses">Amazon SES (Amazon Simple Email Service)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {selectedType === 'smtp' && (
                  <div className="grid grid-cols-1 gap-4 p-4 border rounded-lg">
                    <h4 className="font-medium">Configuration SMTP</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="host"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hôte *</FormLabel>
                            <FormControl>
                              <Input placeholder="smtp.gmail.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="port"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Port *</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="587"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 587)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom d'utilisateur *</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mot de passe *</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="encryption"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Chiffrement</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="tls">TLS</SelectItem>
                                <SelectItem value="ssl">SSL</SelectItem>
                                <SelectItem value="none">Aucun</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {selectedType === 'sendgrid' && (
                  <div className="grid grid-cols-1 gap-4 p-4 border rounded-lg">
                    <h4 className="font-medium">Configuration SendGrid</h4>
                    <FormField
                      control={form.control}
                      name="api_key"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Key SendGrid *</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="SG.xxxxx" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {selectedType === 'mailgun' && (
                  <div className="grid grid-cols-1 gap-4 p-4 border rounded-lg">
                    <h4 className="font-medium">Configuration Mailgun</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="api_key"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Key Mailgun *</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="key-xxxxx" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="domain"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Domaine Mailgun *</FormLabel>
                            <FormControl>
                              <Input placeholder="mg.mondomaine.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="region"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Région</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner une région" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="us">US (États-Unis)</SelectItem>
                                <SelectItem value="eu">EU (Europe)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {selectedType === 'amazon_ses' && (
                  <div className="grid grid-cols-1 gap-4 p-4 border rounded-lg">
                    <h4 className="font-medium">Configuration Amazon SES</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="api_key"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Access Key ID *</FormLabel>
                            <FormControl>
                              <Input placeholder="AKIAXXXXXXXXXXXXXXXX" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Secret Access Key *</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="region"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Région AWS *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner une région" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="us-east-1">us-east-1 (N. Virginia)</SelectItem>
                                <SelectItem value="us-west-2">us-west-2 (Oregon)</SelectItem>
                                <SelectItem value="eu-west-1">eu-west-1 (Ireland)</SelectItem>
                                <SelectItem value="eu-central-1">eu-central-1 (Frankfurt)</SelectItem>
                                <SelectItem value="ap-southeast-1">ap-southeast-1 (Singapore)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                  <h4 className="col-span-2 font-medium">Expéditeur par défaut</h4>
                  <FormField
                    control={form.control}
                    name="from_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom expéditeur *</FormLabel>
                        <FormControl>
                          <Input placeholder="Mon Entreprise" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="from_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email expéditeur *</FormLabel>
                        <FormControl>
                          <Input placeholder="noreply@monentreprise.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Serveur actif</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Ce serveur peut être utilisé pour l'envoi d'emails
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button 
                      type="button" 
                      variant="secondary" 
                      onClick={handleTestConnection}
                      disabled={testingConnection}
                    >
                      <TestTube className="mr-2 h-4 w-4" />
                      {testingConnection ? "Test en cours..." : "Tester la connexion"}
                    </Button>
                    <Button type="submit">
                      Créer le serveur
                    </Button>
                  </div>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier le serveur d'envoi</DialogTitle>
              <DialogDescription>
                Modifiez la configuration de votre serveur d'envoi.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom du serveur</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: SendGrid Production" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner le type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="smtp">SMTP (serveur SMTP classique)</SelectItem>
                            <SelectItem value="sendgrid">SendGrid (API SendGrid)</SelectItem>
                            <SelectItem value="mailgun">Mailgun (API Mailgun)</SelectItem>
                            <SelectItem value="amazon_ses">Amazon SES (Amazon Simple Email Service)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {selectedEditType === 'smtp' && (
                  <div className="grid grid-cols-1 gap-4 p-4 border rounded-lg">
                    <h4 className="font-medium">Configuration SMTP</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="host"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hôte *</FormLabel>
                            <FormControl>
                              <Input placeholder="smtp.gmail.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="port"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Port *</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="587"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 587)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom d'utilisateur *</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mot de passe *</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Laissez vide pour conserver" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="encryption"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Chiffrement</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="tls">TLS</SelectItem>
                                <SelectItem value="ssl">SSL</SelectItem>
                                <SelectItem value="none">Aucun</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {selectedEditType === 'sendgrid' && (
                  <div className="grid grid-cols-1 gap-4 p-4 border rounded-lg">
                    <h4 className="font-medium">Configuration SendGrid</h4>
                    <FormField
                      control={editForm.control}
                      name="api_key"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Key SendGrid *</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Laissez vide pour conserver" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {selectedEditType === 'mailgun' && (
                  <div className="grid grid-cols-1 gap-4 p-4 border rounded-lg">
                    <h4 className="font-medium">Configuration Mailgun</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="api_key"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Key Mailgun *</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="key-xxxxx" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="domain"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Domaine Mailgun *</FormLabel>
                            <FormControl>
                              <Input placeholder="mg.mondomaine.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={editForm.control}
                        name="region"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Région</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner une région" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="us">US (États-Unis)</SelectItem>
                                <SelectItem value="eu">EU (Europe)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {selectedEditType === 'amazon_ses' && (
                  <div className="grid grid-cols-1 gap-4 p-4 border rounded-lg">
                    <h4 className="font-medium">Configuration Amazon SES</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="api_key"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Access Key ID *</FormLabel>
                            <FormControl>
                              <Input placeholder="AKIAXXXXXXXXXXXXXXXX" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Secret Access Key *</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={editForm.control}
                        name="region"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Région AWS *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner une région" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="us-east-1">us-east-1 (N. Virginia)</SelectItem>
                                <SelectItem value="us-west-2">us-west-2 (Oregon)</SelectItem>
                                <SelectItem value="eu-west-1">eu-west-1 (Ireland)</SelectItem>
                                <SelectItem value="eu-central-1">eu-central-1 (Frankfurt)</SelectItem>
                                <SelectItem value="ap-southeast-1">ap-southeast-1 (Singapore)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                  <h4 className="col-span-2 font-medium">Expéditeur par défaut</h4>
                  <FormField
                    control={editForm.control}
                    name="from_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom expéditeur *</FormLabel>
                        <FormControl>
                          <Input placeholder="Mon Entreprise" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="from_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email expéditeur *</FormLabel>
                        <FormControl>
                          <Input placeholder="noreply@monentreprise.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Serveur actif</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Ce serveur peut être utilisé pour l'envoi d'emails
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit">
                      Modifier le serveur
                    </Button>
                  </div>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Serveurs configurés</CardTitle>
          <CardDescription>
            Gérez vos serveurs d'envoi et leurs configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center p-4">Chargement...</div>
          ) : servers.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <p>Aucun serveur d'envoi configuré</p>
              <p className="text-sm">Cliquez sur "Ajouter un serveur" pour commencer</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Email expéditeur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servers.map((server) => (
                  <TableRow key={server.id}>
                    <TableCell className="font-medium">{server.name}</TableCell>
                    <TableCell>
                      <Badge variant={getTypeVariant(server.type)}>
                        {getTypeLabel(server.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{server.from_name}</span>
                        <span className="text-sm text-muted-foreground">
                          {server.from_email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={server.is_active ? "default" : "secondary"}>
                        {server.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditServer(server)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteServer(server.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SmtpServersPage;
