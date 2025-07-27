
import { useState } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Edit, 
  BarChart3,
  RefreshCw,
  Send,
  Clock,
  Archive,
  Mail
} from 'lucide-react';
import { Campaign } from '@/types/database';

interface CampaignTableRowProps {
  campaign: Campaign & {
    email_templates: { name: string } | null;
    users: { full_name: string };
  };
  queueStats: any;
  onEdit: (campaign: Campaign) => void;
  onViewStats: (campaign: Campaign) => void;
  onRetryFailed: (campaignId: string) => void;
  isRetrying: boolean;
}

export function CampaignTableRow({
  campaign,
  queueStats,
  onEdit,
  onViewStats,
  onRetryFailed,
  isRetrying
}: CampaignTableRowProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'sending': return 'bg-yellow-100 text-yellow-800';
      case 'sent': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-orange-100 text-orange-800';
      case 'archived': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Mail className="h-4 w-4" />;
      case 'scheduled': return <Clock className="h-4 w-4" />;
      case 'sending': return <Send className="h-4 w-4" />;
      case 'sent': return <Send className="h-4 w-4" />;
      case 'paused': return <Clock className="h-4 w-4" />;
      case 'archived': return <Archive className="h-4 w-4" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const stats = queueStats || { sent: 0, failed: 0, total: 0 };

  return (
    <TableRow className="hover:bg-gray-50">
      <TableCell className="font-medium">
        <div className="flex items-center space-x-2">
          {getStatusIcon(campaign.status)}
          <div>
            <div className="font-semibold">{campaign.name}</div>
            <div className="text-sm text-gray-600">{campaign.subject}</div>
          </div>
        </div>
      </TableCell>
      
      <TableCell>
        <Badge className={getStatusColor(campaign.status)}>
          {campaign.status}
        </Badge>
      </TableCell>
      
      <TableCell>
        {formatDate(campaign.created_at)}
      </TableCell>
      
      <TableCell>
        {campaign.sent_at ? formatDate(campaign.sent_at) : '-'}
      </TableCell>
      
      <TableCell>
        {campaign.email_templates?.name || '-'}
      </TableCell>
      
      <TableCell>
        <div>
          <div className="font-medium">{campaign.from_name}</div>
          <div className="text-sm text-gray-600">{campaign.from_email}</div>
        </div>
      </TableCell>
      
      <TableCell>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Envoyés:</span>
            <span className="font-medium text-green-600">{stats.sent || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Échecs:</span>
            <span className="font-medium text-red-600">{stats.failed || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Total:</span>
            <span className="font-medium">{stats.total || 0}</span>
          </div>
        </div>
      </TableCell>
      
      <TableCell>
        <div className="flex space-x-2">
          {stats.failed > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRetryFailed(campaign.id)}
              disabled={isRetrying}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Relancer
            </Button>
          )}
          
          {campaign.status === 'sent' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewStats(campaign)}
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              Stats
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(campaign)}
          >
            <Edit className="h-4 w-4 mr-1" />
            Modifier
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
