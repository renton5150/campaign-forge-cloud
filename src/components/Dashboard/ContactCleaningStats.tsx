
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ContactCleaningResult } from '@/utils/contactCleaning';
import { Users, UserX, Shield, Copy } from 'lucide-react';

interface ContactCleaningStatsProps {
  cleaningResult: ContactCleaningResult;
}

export default function ContactCleaningStats({ cleaningResult }: ContactCleaningStatsProps) {
  const { stats } = cleaningResult;

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-green-600" />
          <span>Nettoyage des contacts</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-600">Original</span>
            </div>
            <div className="text-lg font-semibold">{stats.originalCount}</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-2">
              <UserX className="h-4 w-4 text-red-600" />
              <span className="text-sm text-gray-600">Emails blacklistés</span>
            </div>
            <div className="text-lg font-semibold text-red-600">{stats.filteredByEmailCount}</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-2">
              <Shield className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-gray-600">Domaines blacklistés</span>
            </div>
            <div className="text-lg font-semibold text-orange-600">{stats.filteredByDomainCount}</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-2">
              <Copy className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-gray-600">Doublons</span>
            </div>
            <div className="text-lg font-semibold text-yellow-600">{stats.duplicatesRemovedCount}</div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-green-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-green-800">
              Contacts finaux à envoyer:
            </span>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {stats.cleanedCount} contacts
            </Badge>
          </div>
        </div>

        {(stats.filteredByEmailCount > 0 || stats.filteredByDomainCount > 0) && (
          <div className="mt-2 text-xs text-gray-600">
            {stats.filteredByEmailCount + stats.filteredByDomainCount + stats.duplicatesRemovedCount} contacts exclus au total
          </div>
        )}
      </CardContent>
    </Card>
  );
}
