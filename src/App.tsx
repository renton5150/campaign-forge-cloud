
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';

import { AuthProvider } from '@/components/auth/AuthProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import AuthPage from '@/pages/AuthPage';
import Index from '@/pages/Index';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient();

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
              <Route path="/contacts" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/contact-lists" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/segments" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/templates" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/campaigns" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/import" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/blacklists" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/smtp-servers" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/tenants" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
