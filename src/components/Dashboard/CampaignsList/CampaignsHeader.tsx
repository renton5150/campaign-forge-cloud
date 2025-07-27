
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';

interface CampaignsHeaderProps {
  onNewCampaign: () => void;
  onProcessQueue: () => void;
  isProcessing: boolean;
}

export function CampaignsHeader({
  onNewCampaign,
  onProcessQueue,
  isProcessing
}: CampaignsHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Campagnes Email</h1>
        <p className="text-gray-600 mt-2">
          Gérez vos campagnes d'email marketing
        </p>
      </div>
      <div className="flex space-x-2">
        <Button
          variant="outline"
          onClick={onProcessQueue}
          disabled={isProcessing}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {isProcessing ? 'Traitement...' : 'Traiter Queue'}
        </Button>
        <Button onClick={onNewCampaign} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Campagne
        </Button>
      </div>
    </div>
  );
}
