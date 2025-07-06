import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, Settings, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const smtpServerSchema = z.object({
  name: z.string().min(1, 'Le nom est obligatoire'),
  type: z.enum(['smtp', 'sendgrid', 'mailgun']),
  host: z.string().optional(),
  port: z.number().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  from_name: z.string().min(1, 'Le nom expéditeur est obligatoire'),
  from_email: z.string().email('Email invalide'),
  is_active: z.boolean().default(true),
});

type SmtpServerFormData = z.infer<typeof smtpServerSchema>;

// Mock data - À remplacer par un vrai hook
const mockServers = [
  {
    id: '1',
    name: 'SendGrid Production',
    type: 'sendgrid',
    from_name: 'Mon Entreprise',
    from_email: 'noreply@monentreprise.com',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'SMTP Local',
    type: 'smtp',
    from_name: 'Test',
    from_email: 'test@localhost.com',
    is_active: false,
    created_at: '2024-01-02T00:00:00Z'
  }
];

const SmtpServersPage = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
      from_name: '',
      from_email: '',
      is_active: true,
    },
  });

  const onSubmit = async (data: SmtpServerFormData) => {
    try {
      console.log('Création serveur SMTP:', data);
      toast({
        title: "Serveur créé",
        description: "Le serveur d'envoi a été créé avec succès.",
      });
      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le serveur d'envoi.",
        variant: "destructive",
      });
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'sendgrid': return 'SendGrid';
      case 'mailgun': return 'Mailgun';
      case 'smtp': return 'SMTP';
      default: return type;
    }
  };

  const getTypeVariant = (type: string) => {
    switch (type) {
      case 'sendgrid': return 'default';
      case 'mailgun': return 'secondary';
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
          <DialogContent className="sm:max-w-[600px]">
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
                            <SelectItem value="smtp">SMTP</SelectItem>
                            <SelectItem value="sendgrid">SendGrid</SelectItem>
                            <SelectItem value="mailgun">Mailgun</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {form.watch('type') === 'smtp' && (
                  <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                    <h4 className="col-span-2 font-medium">Configuration SMTP</h4>
                    <FormField
                      control={form.control}
                      name="host"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hôte</FormLabel>
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
                          <FormLabel>Port</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="587"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom d'utilisateur</FormLabel>
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
                          <FormLabel>Mot de passe</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                  <h4 className="col-span-2 font-medium">Expéditeur par défaut</h4>
                  <FormField
                    control={form.control}
                    name="from_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom expéditeur</FormLabel>
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
                        <FormLabel>Email expéditeur</FormLabel>
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
                          Ce serveur peut être utilisé for l'envoi d'emails
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
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit">
                    Créer le serveur
                  </Button>
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
              {mockServers.map((server) => (
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
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmtpServersPage;