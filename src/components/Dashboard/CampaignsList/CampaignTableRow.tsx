
import { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import DeleteCampaignModal from './DeleteCampaignModal';

interface CampaignTableRowProps {
  campaign: any;
  onEdit: (campaign: any) => void;
  onViewStats: (campaign: any) => void;
}

export default function CampaignTableRow({ campaign, onEdit, onViewStats }: CampaignTableRowProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Brouillon</Badge>;
      case 'scheduled':
        return <Badge variant="outline">Programmée</Badge>;
      case 'sending':
        return <Badge className="bg-blue-100 text-blue-800">En cours</Badge>;
      case 'sent':
        return <Badge className="bg-green-100 text-green-800">Envoyée</Badge>;
      case 'failed':
        return <Badge variant="destructive">Échec</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: fr });
  };

  return (
    <>
      <TableRow className="hover:bg-gray-50">
        <TableCell className="font-medium">
          <div>
            <div className="font-semibold text-gray-900">{campaign.name}</div>
            <div className="text-sm text-gray-500">{campaign.subject}</div>
          </div>
        </TableCell>
        
        <TableCell>
          {getStatusBadge(campaign.status)}
        </TableCell>
        
        <TableCell className="text-sm text-gray-600">
          {formatDate(campaign.created_at)}
        </TableCell>
        
        <TableCell className="text-sm text-gray-600">
          {formatDate(campaign.sent_at)}
        </TableCell>
        
        <TableCell className="text-sm text-gray-600">
          {campaign.email_templates?.name || '-'}
        </TableCell>
        
        <TableCell className="text-sm text-gray-600">
          <div>
            <div className="font-medium">{campaign.from_name || '-'}</div>
            <div className="text-xs text-gray-500">{campaign.from_email || '-'}</div>
          </div>
        </TableCell>
        
        <TableCell className="text-sm">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Envoyés:</span>
              <span className="font-medium text-green-600">{campaign.sent_count || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Échecs:</span>
              <span className="font-medium text-red-600">{campaign.failed_count || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total:</span>
              <span className="font-medium">{campaign.total_recipients || 0}</span>
            </div>
          </div>
        </TableCell>
        
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(campaign)}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewStats(campaign)}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Statistiques
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setShowDeleteModal(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      <DeleteCampaignModal
        campaignId={campaign.id}
        campaignName={campaign.name}
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
      />
    </>
  );
}
