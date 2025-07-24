
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { User, UserRole } from '@/types/database';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, role?: UserRole) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // Query to fetch user profile with better error handling
  const { data: user, isLoading: isUserLoading, error } = useQuery({
    queryKey: ["user", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      
      console.log('Fetching user profile for:', session.user.id);
      
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        throw error;
      }
      
      console.log('User profile loaded:', data);
      
      // If user doesn't have a tenant_id, try to create one
      if (data && !data.tenant_id) {
        console.log('User has no tenant_id, attempting to create/assign tenant...');
        await createTenantForUser(data);
        
        // Refetch user data after tenant creation
        const { data: updatedUser, error: updateError } = await supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();
        
        if (!updateError && updatedUser) {
          console.log('Updated user profile with tenant:', updatedUser);
          return updatedUser;
        }
      }
      
      return data;
    },
    enabled: !!session?.user?.id,
    retry: 3,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Function to create a tenant for a user
  const createTenantForUser = async (userData: User) => {
    try {
      console.log('Creating tenant for user:', userData.email);
      
      // Extract domain from email
      const domain = userData.email.split('@')[1];
      const companyName = domain.split('.')[0];
      
      // Create tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          company_name: companyName,
          domain: domain,
          status: 'active'
        })
        .select()
        .single();
      
      if (tenantError) {
        console.error('Error creating tenant:', tenantError);
        return;
      }
      
      console.log('Tenant created:', tenant);
      
      // Update user with tenant_id
      const { error: updateError } = await supabase
        .from('users')
        .update({ tenant_id: tenant.id })
        .eq('id', userData.id);
      
      if (updateError) {
        console.error('Error updating user with tenant_id:', updateError);
      } else {
        console.log('User updated with tenant_id:', tenant.id);
      }
    } catch (error) {
      console.error('Error in createTenantForUser:', error);
    }
  };

  const refreshUser = async () => {
    if (session?.user?.id) {
      queryClient.invalidateQueries({ queryKey: ['user', session.user.id] });
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        
        // Invalidate user query when auth state changes
        if (session?.user) {
          queryClient.invalidateQueries({ queryKey: ['user', session.user.id] });
        } else {
          queryClient.clear();
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, role: UserRole = 'tenant_sdr') => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName
        }
      }
    });

    if (error) return { error };

    return { error: null };
  };

  const signOut = async () => {
    try {
      queryClient.clear();
      await supabase.auth.signOut({ scope: 'global' });
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
      window.location.href = '/auth';
    }
  };

  // Show loading while checking auth or fetching user
  const isLoading = loading || isUserLoading;

  return (
    <AuthContext.Provider value={{
      session,
      user: user || null,
      loading: isLoading,
      signIn,
      signUp,
      signOut,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
