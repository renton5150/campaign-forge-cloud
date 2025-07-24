
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { useToast } from '@/hooks/use-toast';

const AuthPage = () => {
  const { user, loading, cleanupAuthState } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user && !loading) {
      window.location.href = '/';
    }
  }, [user, loading]);

  const handleCleanAuth = () => {
    cleanupAuthState();
    toast({
      title: "État d'authentification nettoyé",
      description: "Vous pouvez maintenant vous reconnecter",
    });
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <Tabs defaultValue="login" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Connexion</TabsTrigger>
            <TabsTrigger value="signup">Inscription</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <LoginForm />
          </TabsContent>
          
          <TabsContent value="signup">
            <SignUpForm />
          </TabsContent>
        </Tabs>
        
        <div className="mt-6 text-center">
          <Button 
            onClick={handleCleanAuth}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Nettoyer l'état d'authentification
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
