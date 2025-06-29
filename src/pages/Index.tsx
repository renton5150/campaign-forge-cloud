
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Layout/Sidebar';
import DashboardPage from '@/components/Dashboard/DashboardPage';
import TenantsManagement from '@/components/Dashboard/TenantsManagement';
import UsersManagement from '@/components/Dashboard/UsersManagement';
import DomainsManagement from '@/components/Dashboard/DomainsManagement';
import RolesManagement from '@/components/Dashboard/RolesManagement';

const Index = () => {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
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
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-100">
        <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
        <main className="flex-1 overflow-auto">
          {renderPage()}
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Index;
