import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';

import { AuthProvider } from '@/components/auth/AuthProvider';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import AuthPage from '@/pages/AuthPage';
import Index from '@/pages/Index';
import ContactsPage from '@/pages/ContactsPage';
import ContactsListsPage from '@/pages/ContactsListsPage';
import ContactsSegmentsPage from '@/pages/ContactsSegmentsPage';
import ContactsImportPage from '@/pages/ContactsImportPage';
import ContactsBlacklistsPage from '@/pages/ContactsBlacklistsPage';
import SmtpServersPage from '@/pages/SmtpServersPage';
import TenantsPage from '@/pages/TenantsPage';
import CampaignsManagement from '@/pages/CampaignsManagement';
import NotFound from '@/pages/NotFound';

import TemplatesPage from './components/Dashboard/Templates/TemplatesPage';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <div className="App">
            <Toaster />
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/signup" element={<AuthPage />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/contacts" element={<ProtectedRoute><ContactsPage /></ProtectedRoute>} />
              <Route path="/contact-lists" element={<ProtectedRoute><ContactsListsPage /></ProtectedRoute>} />
              <Route path="/segments" element={<ProtectedRoute><ContactsSegmentsPage /></ProtectedRoute>} />
              <Route path="/templates" element={<ProtectedRoute><TemplatesPage /></ProtectedRoute>} />
              <Route path="/campaigns" element={<ProtectedRoute><CampaignsManagement /></ProtectedRoute>} />
              <Route path="/import" element={<ProtectedRoute><ContactsImportPage /></ProtectedRoute>} />
              <Route path="/blacklists" element={<ProtectedRoute><ContactsBlacklistsPage /></ProtectedRoute>} />
              <Route path="/smtp-servers" element={<ProtectedRoute><SmtpServersPage /></ProtectedRoute>} />
              <Route path="/tenants" element={<ProtectedRoute><TenantsPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
