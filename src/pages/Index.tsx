
import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import AuthGuard from '@/components/auth/AuthGuard';
import Sidebar from '@/components/Layout/Sidebar';
import DashboardPage from '@/components/Dashboard/DashboardPage';
import TenantsManagement from '@/components/Dashboard/TenantsManagement';
import UsersManagement from '@/components/Dashboard/UsersManagement';
import DomainsManagement from '@/components/Dashboard/DomainsManagement';
import CampaignsManagement from '@/components/Dashboard/CampaignsManagement';
import RolesManagement from '@/components/Dashboard/RolesManagement';
import ContactsPage from '@/components/Dashboard/ContactsPage';
import ContactsListsPage from '@/components/Dashboard/ContactsListsPage';
import ContactsImportPage from '@/components/Dashboard/ContactsImportPage';
import ContactsBlacklistsPage from '@/components/Dashboard/ContactsBlacklistsPage';
import ContactsSegmentsPage from '@/components/Dashboard/ContactsSegmentsPage';
import SmtpServersPage from '@/components/Dashboard/SmtpServersPage';
import TemplatesPage from '@/components/Dashboard/Templates/TemplatesPage';

const Index = () => {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedListId, setSelectedListId] = useState<string | undefined>();

  const handleNavigateToContacts = (listId?: string) => {
    setSelectedListId(listId);
    setCurrentPage('contacts');
  };

  const handleNavigateToList = (listId: string) => {
    setSelectedListId(listId);
    setCurrentPage('contacts');
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'campaigns':
        return <CampaignsManagement />;
      case 'contacts':
        return <ContactsPage 
          initialSelectedList={selectedListId} 
          onNavigateToList={handleNavigateToList}
        />;
      case 'contacts-lists':
        return <ContactsListsPage onNavigateToContacts={handleNavigateToContacts} />;
      case 'contacts-import':
        return <ContactsImportPage />;
      case 'contacts-blacklists':
        return <ContactsBlacklistsPage />;
      case 'contacts-segments':
        return <ContactsSegmentsPage />;
      case 'smtp-servers':
        return <SmtpServersPage />;
      case 'templates':
        return <TemplatesPage />;
      case 'tenants':
        return <TenantsManagement />;
      case 'users':
        return <UsersManagement />;
      case 'domains':
        return <DomainsManagement />;
      case 'roles':
        return <RolesManagement />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-100">
        <Sidebar 
          currentPage={currentPage} 
          onPageChange={setCurrentPage}
        />
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </AuthGuard>
  );
};

export default Index;
