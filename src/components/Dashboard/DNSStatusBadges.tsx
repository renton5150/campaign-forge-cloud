
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

type DNSStatus = 'pending' | 'verified' | 'failed';

interface DNSStatusBadgesProps {
  dkimStatus: DNSStatus;
  spfStatus: DNSStatus;
  dmarcStatus: DNSStatus;
  verificationStatus: DNSStatus;
}

const getStatusIcon = (status: DNSStatus) => {
  switch (status) {
    case 'verified':
      return <CheckCircle className="w-3 h-3" />;
    case 'failed':
      return <XCircle className="w-3 h-3" />;
    default:
      return <Clock className="w-3 h-3" />;
  }
};

const getStatusVariant = (status: DNSStatus) => {
  switch (status) {
    case 'verified':
      return 'default';
    case 'failed':
      return 'destructive';
    default:
      return 'secondary';
  }
};

const getStatusLabel = (type: string, status: DNSStatus) => {
  const statusText = status === 'verified' ? 'Vérifié' : 
                     status === 'failed' ? 'Échec' : 'En attente';
  return `${type}: ${statusText}`;
};

const getTooltipContent = (type: string, status: DNSStatus) => {
  const descriptions = {
    DKIM: 'DomainKeys Identified Mail - Authentifie les emails sortants',
    SPF: 'Sender Policy Framework - Autorise les serveurs d\'envoi',
    DMARC: 'Domain-based Message Authentication - Politique d\'authentification',
    Verification: 'Vérification du domaine - Confirmation de propriété'
  };
  
  return (
    <div className="text-xs">
      <div className="font-semibold">{descriptions[type as keyof typeof descriptions]}</div>
      <div className="mt-1">
        Statut: {status === 'verified' ? 'Vérifié' : 
                 status === 'failed' ? 'Échec' : 'En attente'}
      </div>
    </div>
  );
};

export const DNSStatusBadges: React.FC<DNSStatusBadgesProps> = ({
  dkimStatus,
  spfStatus,
  dmarcStatus,
  verificationStatus
}) => {
  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-1">
        <Tooltip>
          <TooltipTrigger>
            <Badge variant={getStatusVariant(dkimStatus)} className="text-xs px-2 py-1">
              {getStatusIcon(dkimStatus)}
              <span className="ml-1">DKIM</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {getTooltipContent('DKIM', dkimStatus)}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger>
            <Badge variant={getStatusVariant(spfStatus)} className="text-xs px-2 py-1">
              {getStatusIcon(spfStatus)}
              <span className="ml-1">SPF</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {getTooltipContent('SPF', spfStatus)}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger>
            <Badge variant={getStatusVariant(dmarcStatus)} className="text-xs px-2 py-1">
              {getStatusIcon(dmarcStatus)}
              <span className="ml-1">DMARC</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {getTooltipContent('DMARC', dmarcStatus)}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger>
            <Badge variant={getStatusVariant(verificationStatus)} className="text-xs px-2 py-1">
              {getStatusIcon(verificationStatus)}
              <span className="ml-1">Verification</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {getTooltipContent('Verification', verificationStatus)}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
