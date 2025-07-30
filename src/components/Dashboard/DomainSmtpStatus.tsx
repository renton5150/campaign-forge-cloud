
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSmtpServers } from '@/hooks/useSmtpServers';
import { Link2, AlertCircle } from 'lucide-react';

interface DomainSmtpStatusProps {
  domainId: string;
  domainName: string;
}

export function DomainSmtpStatus({ domainId, domainName }: DomainSmtpStatusProps) {
  const { servers } = useSmtpServers();
  
  // Trouver le serveur SMTP lié à ce domaine
  const linkedServer = servers.find(server => server.sending_domain_id === domainId);

  if (linkedServer) {
    return (
      <div className="flex items-center space-x-2">
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <Link2 className="h-3 w-3 mr-1" />
          Lié : {linkedServer.name}
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
        <AlertCircle className="h-3 w-3 mr-1" />
        Non lié
      </Badge>
    </div>
  );
}
