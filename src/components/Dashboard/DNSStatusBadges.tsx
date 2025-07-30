
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface DNSStatusBadgesProps {
  dkimStatus: string;
  spfStatus: string;
  dmarcStatus: string;
  verificationStatus: string;
  domainName: string;
}

const DNSStatusBadges: React.FC<DNSStatusBadgesProps> = ({
  dkimStatus,
  spfStatus,
  dmarcStatus,
  verificationStatus,
  domainName
}) => {
  const getStatusBadge = (status: string, type: string) => {
    const getIcon = () => {
      switch (status) {
        case 'verified':
          return <CheckCircle className="h-3 w-3 mr-1" />;
        case 'failed':
          return <XCircle className="h-3 w-3 mr-1" />;
        default:
          return <Clock className="h-3 w-3 mr-1" />;
      }
    };

    const getVariant = () => {
      switch (status) {
        case 'verified':
          return 'default';
        case 'failed':
          return 'destructive';
        default:
          return 'secondary';
      }
    };

    const getBgColor = () => {
      switch (status) {
        case 'verified':
          return 'bg-green-600';
        case 'failed':
          return '';
        default:
          return '';
      }
    };

    return (
      <Badge 
        variant={getVariant()} 
        className={`text-xs ${status === 'verified' ? getBgColor() : ''}`}
      >
        {getIcon()}
        {type.toUpperCase()}
      </Badge>
    );
  };

  const getTooltipContent = (status: string, type: string) => {
    const statusText = {
      'verified': '✅ Vérifié',
      'failed': '❌ Échec',
      'pending': '⏳ En attente'
    }[status] || '⏳ En attente';

    const descriptions = {
      'dkim': 'DKIM (DomainKeys Identified Mail) - Authentification des emails par signature cryptographique',
      'spf': 'SPF (Sender Policy Framework) - Autorise les serveurs à envoyer des emails pour ce domaine',
      'dmarc': 'DMARC (Domain-based Message Authentication) - Politique de gestion des emails non authentifiés',
      'verification': 'Verification Token - Preuve de propriété du domaine'
    };

    return (
      <div className="max-w-xs">
        <div className="font-medium">{type.toUpperCase()}: {statusText}</div>
        <div className="text-sm text-gray-600 mt-1">{descriptions[type.toLowerCase() as keyof typeof descriptions]}</div>
        {status === 'failed' && (
          <div className="text-sm text-red-600 mt-1">Vérifiez la configuration DNS pour {domainName}</div>
        )}
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <div>{getStatusBadge(dkimStatus, 'DKIM')}</div>
          </TooltipTrigger>
          <TooltipContent>
            {getTooltipContent(dkimStatus, 'dkim')}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div>{getStatusBadge(spfStatus, 'SPF')}</div>
          </TooltipTrigger>
          <TooltipContent>
            {getTooltipContent(spfStatus, 'spf')}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div>{getStatusBadge(dmarcStatus, 'DMARC')}</div>
          </TooltipTrigger>
          <TooltipContent>
            {getTooltipContent(dmarcStatus, 'dmarc')}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div>{getStatusBadge(verificationStatus, 'VERIF')}</div>
          </TooltipTrigger>
          <TooltipContent>
            {getTooltipContent(verificationStatus, 'verification')}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export default DNSStatusBadges;
