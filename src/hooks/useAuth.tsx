
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
  cleanupAuthState: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Function to clean up authentication state
const cleanupAuthState = () => {
  console.log('Cleaning up authentication state...');
  
  // Remove standard auth tokens
  localStorage.removeItem('supabase.auth.token');
  
  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  
  // Remove from sessionStorage if in use
  if (typeof sessionStorage !== 'undefined') {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // Query to fetch user profile
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
      
      // If no user profile exists, create one
      if (!data) {
        console.log('No user profile found, creating one...');
        const newUser = await createUserProfile(session.user);
        return newUser;
      }
      
      // Only assign tenant for non-super_admin users
      if (data && !data.tenant_id && data.role !== 'super_admin') {
        console.log('User has no tenant_id and is not super_admin, attempting to create/assign tenant...');
        await createOrAssignTenant(data);
        
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

  // Function to create user profile
  const createUserProfile = async (authUser: SupabaseUser): Promise<User | null> => {
    try {
      console.log('Creating user profile for:', authUser.email);
      
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          email: authUser.email || '',
          full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Utilisateur',
          role: 'tenant_sdr' as UserRole,
          tenant_id: null
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating user profile:', error);
        throw error;
      }
      
      console.log('User profile created:', data);
      
      // Only create tenant for non-super_admin users
      if (data && data.role !== 'super_admin') {
        await createOrAssignTenant(data);
        
        // Refetch user data after tenant creation
        const { data: updatedUser, error: updateError } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle();
        
        if (!updateError && updatedUser) {
          return updatedUser;
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error in createUserProfile:', error);
      throw error;
    }
  };

  // Function to create or assign a tenant for a user (only for non-super_admin users)
  const createOrAssignTenant = async (userData: User) => {
    // Skip tenant creation for super_admin users
    if (userData.role === 'super_admin') {
      console.log('Skipping tenant creation for super_admin user');
      return;
    }
    
    try {
      console.log('Creating/assigning tenant for user:', userData.email);
      
      // Extract domain from email
      const domain = userData.email.split('@')[1];
      if (!domain) {
        throw new Error('Invalid email domain');
      }
      
      const companyName = domain.split('.')[0];
      
      // First, check if a tenant already exists for this domain
      const { data: existingTenant, error: searchError } = await supabase
        .from('tenants')
        .select('*')
        .eq('domain', domain)
        .maybeSingle();
      
      if (searchError && searchError.code !== 'PGRST116') {
        console.error('Error searching for existing tenant:', searchError);
        throw searchError;
      }
      
      let tenantId: string;
      
      if (existingTenant) {
        // Use existing tenant
        console.log('Found existing tenant for domain:', domain, existingTenant);
        tenantId = existingTenant.id;
      } else {
        // Create new tenant with a unique name to avoid conflicts
        const uniqueCompanyName = `${companyName}-${Date.now()}`;
        
        const { data: newTenant, error: tenantError } = await supabase
          .from('tenants')
          .insert({
            company_name: uniqueCompanyName,
            domain: domain,
            status: 'active'
          })
          .select()
          .single();
        
        if (tenantError) {
          console.error('Error creating tenant:', tenantError);
          
          // If it's a duplicate key error, try to find the existing tenant again
          if (tenantError.code === '23505') {
            const { data: retryTenant, error: retryError } = await supabase
              .from('tenants')
              .select('*')
              .eq('domain', domain)
              .maybeSingle();
            
            if (retryError) {
              console.error('Error retrying tenant search:', retryError);
              throw retryError;
            }
            
            if (retryTenant) {
              tenantId = retryTenant.id;
              console.log('Using existing tenant after duplicate error:', retryTenant);
            } else {
              throw tenantError;
            }
          } else {
            throw tenantError;
          }
        } else {
          console.log('New tenant created:', newTenant);
          tenantId = newTenant.id;
        }
      }
      
      // Update user with tenant_id
      const { error: updateError } = await supabase
        .from('users')
        .update({ tenant_id: tenantId })
        .eq('id', userData.id);
      
      if (updateError) {
        console.error('Error updating user with tenant_id:', updateError);
        throw updateError;
      } else {
        console.log('User updated with tenant_id:', tenantId);
      }
    } catch (error) {
      console.error('Error in createOrAssignTenant:', error);
      throw error;
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
    try {
      // Clean up existing state
      cleanupAuthState();
      
      // Attempt global sign out first
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
        console.log('Global signout failed, continuing...');
      }
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      return { error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: UserRole = 'tenant_sdr') => {
    try {
      // Clean up existing state
      cleanupAuthState();
      
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
    } catch (error) {
      console.error('Sign up error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      // Clean up auth state
      cleanupAuthState();
      queryClient.clear();
      
      // Attempt global sign out
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.log('Global signout failed, continuing...');
      }
      
      // Force page reload for a clean state
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
      cleanupAuthState,
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
