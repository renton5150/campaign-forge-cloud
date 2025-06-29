
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'super_admin' | 'tenant_admin' | 'tenant_growth' | 'tenant_sdr';
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading, session } = useAuth();

  useEffect(() => {
    if (!loading && !session) {
      window.location.href = '/auth';
    }
  }, [loading, session]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session || !user) {
    return null;
  }

  // Check role-based access
  if (requiredRole && user.role !== requiredRole && user.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
          <p className="text-gray-600">Vous n'avez pas les permissions nécessaires.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
