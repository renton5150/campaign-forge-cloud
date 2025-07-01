import { useState } from 'react';
import { Mail, Phone, Building, Calendar, Activity, Tag, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Contact } from '@/types/database';
import { useContactActivities } from '@/hooks/useContactActivities';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ContactDetailsModalProps {
  contact: Contact;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ContactDetailsModal({ contact, open, onOpenChange }: ContactDetailsModalProps) {
  const { activities, isLoading: activitiesLoading } = useContactActivities(contact.id);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Actif</Badge>;
      case 'bounced':
        return <Badge variant="destructive">Bounce</Badge>;
      case 'unsubscribed':
        return <Badge variant="secondary">Désabonné</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getValidationBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return <Badge className="bg-green-100 text-green-800">Email valide</Badge>;
      case 'invalid':
        return <Badge variant="destructive">Email invalide</Badge>;
      case 'risky':
        return <Badge variant="secondary">Email risqué</Badge>;
      default:
        return <Badge variant="outline">Non vérifié</Badge>;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'email_open':
        return '👁️';
      case 'email_click':
        return '🖱️';
      case 'email_bounce':
        return '⚠️';
      case 'unsubscribe':
        return '✋';
      case 'import':
        return '📥';
      case 'manual_add':
        return '➕';
      default:
        return '📝';
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'email_open':
        return 'Email ouvert';
      case 'email_click':
        return 'Lien cliqué';
      case 'email_bounce':
        return 'Email en bounce';
      case 'unsubscribe':
        return 'Désabonnement';
      case 'import':
        return 'Importé';
      case 'manual_add':
        return 'Ajouté manuellement';
      default:
        return type;
    }
  };

  const formatEngagementScore = (score: number) => {
    if (score >= 70) return { color: 'text-green-600', label: 'Très engagé' };
    if (score >= 40) return { color: 'text-orange-600', label: 'Moyennement engagé' };
    return { color: 'text-red-600', label: 'Peu engagé' };
  };

  const engagementInfo = formatEngagementScore(contact.engagement_score || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {contact.first_name?.[0]?.toUpperCase() || contact.email[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-lg">
                {contact.first_name || contact.last_name 
                  ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
                  : 'Contact sans nom'
                }
              </div>
              <div className="text-sm text-muted-foreground font-normal">
                {contact.email}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="activity">Activité</TabsTrigger>
            <TabsTrigger value="details">Détails</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Informations principales */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Informations personnelles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{contact.email}</span>
                  </div>
                  {contact.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{contact.phone}</span>
                    </div>
                  )}
                  {contact.company && (
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span>{contact.company}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Ajouté le {format(new Date(contact.created_at), 'dd MMMM yyyy', { locale: fr })}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Statuts et scores</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Statut :</span>
                    {getStatusBadge(contact.status || 'unknown')}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Validation email :</span>
                    {getValidationBadge(contact.validation_status || 'unknown')}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Score d'engagement :</span>
                    <div className="text-right">
                      <div className={`font-bold ${engagementInfo.color}`}>
                        {contact.engagement_score || 0}/100
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {engagementInfo.label}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Source :</span>
                    <Badge variant="outline">{contact.source || 'Inconnue'}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tags */}
            {contact.tags && contact.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {contact.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {contact.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {contact.notes}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Historique d'activité
                </CardTitle>
                <CardDescription>
                  Toutes les interactions avec ce contact
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activitiesLoading ? (
                  <div className="text-center py-4">Chargement...</div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune activité enregistrée
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 pb-3 border-b last:border-b-0">
                        <div className="text-lg">{getActivityIcon(activity.activity_type)}</div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">
                              {getActivityLabel(activity.activity_type)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(activity.timestamp), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                            </span>
                          </div>
                          {activity.campaigns && (
                            <div className="text-xs text-muted-foreground">
                              Campagne : {activity.campaigns.name}
                            </div>
                          )}
                          {activity.details && Object.keys(activity.details).length > 0 && (
                            <div className="text-xs bg-muted p-2 rounded">
                              <pre>{JSON.stringify(activity.details, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Données personnalisées</CardTitle>
              </CardHeader>
              <CardContent>
                {contact.custom_fields && Object.keys(contact.custom_fields).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(contact.custom_fields).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-sm font-medium">{key} :</span>
                        <span className="text-sm text-muted-foreground">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucune donnée personnalisée
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Informations techniques</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">ID :</span>
                  <span className="text-sm text-muted-foreground font-mono">{contact.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Créé le :</span>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(contact.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Modifié le :</span>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(contact.updated_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                  </span>
                </div>
                {contact.last_activity_at && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Dernière activité :</span>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(contact.last_activity_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Langue :</span>
                  <span className="text-sm text-muted-foreground">{contact.language || 'Non détectée'}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}