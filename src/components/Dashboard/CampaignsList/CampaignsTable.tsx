
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Campaign } from '@/types/database';
import { CampaignTableRow } from './CampaignTableRow';

interface CampaignsTableProps {
  campaigns: (Campaign & {
    email_templates: { name: string } | null;
    users: { full_name: string };
  })[];
  queueStats: Record<string, any>;
  onEdit: (campaign: Campaign) => void;
  onViewStats: (campaign: Campaign) => void;
  onRetryFailed: (campaignId: string) => void;
  isRetrying: boolean;
}

export function CampaignsTable({
  campaigns,
  queueStats,
  onEdit,
  onViewStats,
  onRetryFailed,
  isRetrying
}: CampaignsTableProps) {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campagne</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Date de création</TableHead>
            <TableHead>Date d'envoi</TableHead>
            <TableHead>Template</TableHead>
            <TableHead>Expéditeur</TableHead>
            <TableHead>Statistiques</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => (
            <CampaignTableRow
              key={campaign.id}
              campaign={campaign}
              queueStats={queueStats[campaign.id]}
              onEdit={onEdit}
              onViewStats={onViewStats}
              onRetryFailed={onRetryFailed}
              isRetrying={isRetrying}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
