
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface SendingDomainWithDNS {
  id: string;
  domain: string;
  status: string;
  created_at: string;
  dkim_status: string;
  spf_status?: string;
  dmarc_status?: string;
  verification_status?: string;
  dkim_private_key?: string;
  dkim_public_key?: string;
  dkim_selector?: string;
  dmarc_record?: string;
  spf_record?: string;
  verification_token?: string;
  dns_verified_at?: string | null;
  tenant_id?: string;
}

interface DNSStatusBadgesProps {
  domain: SendingDomainWithDNS;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'verified':
      return <CheckCircle className="w-3 h-3" />;
    case 'failed':
      return <XCircle className="w-3 h-3" />;
    default:
      return <Clock className="w-3 h-3" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'verified':
      return 'default';
    case 'failed':
      return 'destructive';
    default:
      return 'secondary';
  }
};

export const DNSStatusBadges = ({ domain }: DNSStatusBadgesProps) => {
  const dnsRecords = [
    { name: 'DKIM', status: domain.dkim_status },
    { name: 'SPF', status: domain.spf_status || 'pending' },
    { name: 'DMARC', status: domain.dmarc_status || 'pending' },
    { name: 'TXT', status: domain.verification_status || 'pending' }
  ];

  return (
    <TooltipProvider>
      <div className="flex space-x-1">
        {dnsRecords.map((record) => (
          <Tooltip key={record.name}>
            <TooltipTrigger>
              <Badge 
                variant={getStatusColor(record.status)} 
                className="text-xs px-1 py-0 h-5 flex items-center"
              >
                {getStatusIcon(record.status)}
                <span className="ml-1">{record.name}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{record.name}: {record.status === 'verified' ? 'Vérifié' : record.status === 'failed' ? 'Échec' : 'En attente'}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};
