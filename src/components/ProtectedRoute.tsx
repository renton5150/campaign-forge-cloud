
import { useAuth } from '@/hooks/useAuth';
import { Loader2, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'super_admin' | 'tenant_admin' | 'tenant_growth' | 'tenant_sdr';
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading, session, signOut, refreshUser, cleanupAuthState } = useAuth();

  useEffect(() => {
    if (!loading && !session) {
      console.log('No session found, redirecting to auth');
      window.location.href = '/auth';
    }
  }, [loading, session]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profil utilisateur introuvable</h1>
          <p className="text-gray-600 mb-4">
            Votre compte d'authentification existe mais votre profil utilisateur n'a pas été trouvé.
          </p>
          <div className="space-y-3">
            <Button 
              onClick={() => refreshUser()}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualiser le profil
            </Button>
            <Button 
              onClick={() => {
                cleanupAuthState();
                signOut();
              }}
              variant="destructive"
              className="w-full"
            >
              Se déconnecter et réessayer
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Si le problème persiste, contactez l'administrateur.
          </p>
        </div>
      </div>
    );
  }

  // Check role-based access
  if (requiredRole && user.role !== requiredRole && user.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
          <p className="text-gray-600">Vous n'avez pas les permissions nécessaires.</p>
          <p className="text-sm text-gray-500 mt-2">
            Rôle requis: {requiredRole} | Votre rôle: {user.role}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
