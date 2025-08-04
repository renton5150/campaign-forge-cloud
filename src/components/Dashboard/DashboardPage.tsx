import { EmailQueueMonitor } from './EmailQueueMonitor';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import ContactCleaningStats from './ContactCleaningStats';
import { CampaignsStats } from './CampaignsList/CampaignsStats';
import { CampaignProgressMonitor } from './CampaignProgressMonitor';

export function DashboardPage() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Dashboard Email Marketing</h1>
        <p className="text-muted-foreground mt-2">
          Plateforme professionnelle multi-clients - Système haute performance
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <CampaignsStats 
            totalCampaigns={0}
            draftCampaigns={0}
            scheduledCampaigns={0}
            sentCampaigns={0}
          />
        </div>
        
        <div className="grid gap-6 lg:grid-cols-2">
          <EmailQueueMonitor />
          <AnalyticsDashboard />
        </div>
        
        <div className="grid gap-6 lg:grid-cols-1">
          <CampaignProgressMonitor />
        </div>
        
        <div className="grid gap-6 lg:grid-cols-2">
          <ContactCleaningStats cleaningResult={{
            originalContacts: [],
            cleanedContacts: [],
            filteredByEmail: [],
            filteredByDomain: [],
            duplicatesRemoved: [],
            stats: {
              originalCount: 0,
              cleanedCount: 0,
              filteredByEmailCount: 0,
              filteredByDomainCount: 0,
              duplicatesRemovedCount: 0
            }
          }} />
        </div>
      </div>
    </div>
  );
}