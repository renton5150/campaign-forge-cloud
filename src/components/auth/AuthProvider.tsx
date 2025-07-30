import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

const cleanupAuthState = () => {
  console.log('Cleaning up authentication state...');
  
  localStorage.removeItem('supabase.auth.token');
  
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  
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

  const { data: user, isLoading: isUserLoading } = useQuery({
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
      
      if (!data) {
        console.log('No user profile found, creating one...');
        return await createUserProfile(session.user);
      }
      
      // Vérifier si l'utilisateur a un tenant_id
      if (data && !data.tenant_id && data.role !== 'super_admin') {
        console.log('User has no tenant_id, creating tenant...');
        
        try {
          const updatedUser = await createOrAssignTenant(data);
          return updatedUser;
        } catch (tenantError) {
          console.error('Error creating tenant:', tenantError);
          // Retourner l'utilisateur même sans tenant_id pour éviter les boucles infinies
          return data;
        }
      }
      
      return data;
    },
    enabled: !!session?.user?.id,
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

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
      
      if (data && data.role !== 'super_admin') {
        try {
          return await createOrAssignTenant(data);
        } catch (tenantError) {
          console.error('Error creating tenant for new user:', tenantError);
          // Retourner l'utilisateur même sans tenant_id
          return data;
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error in createUserProfile:', error);
      throw error;
    }
  };

  const createOrAssignTenant = async (userData: User): Promise<User> => {
    if (userData.role === 'super_admin') {
      console.log('Skipping tenant creation for super_admin user');
      return userData;
    }
    
    try {
      console.log('Creating/assigning tenant for user:', userData.email);
      
      const domain = userData.email.split('@')[1];
      if (!domain) {
        console.error('Invalid email domain for user:', userData.email);
        return userData;
      }
      
      const companyName = domain.split('.')[0];
      
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
        console.log('Found existing tenant for domain:', domain, existingTenant);
        tenantId = existingTenant.id;
      } else {
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
          
          if (tenantError.code === '23505') {
            const { data: retryTenant, error: retryError } = await supabase
              .from('tenants')
              .select('*')
              .eq('domain', domain)
              .maybeSingle();
            
            if (retryError) {
              console.error('Error retrying tenant search:', retryError);
              return userData;
            }
            
            if (retryTenant) {
              tenantId = retryTenant.id;
              console.log('Using existing tenant after duplicate error:', retryTenant);
            } else {
              console.error('Could not create or find tenant');
              return userData;
            }
          } else {
            console.error('Failed to create tenant:', tenantError);
            return userData;
          }
        } else {
          console.log('New tenant created:', newTenant);
          tenantId = newTenant.id;
        }
      }
      
      // Mettre à jour l'utilisateur avec le tenant_id
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ tenant_id: tenantId })
        .eq('id', userData.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating user with tenant_id:', updateError);
        return userData;
      }
      
      console.log('User updated with tenant_id:', updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Error in createOrAssignTenant:', error);
      return userData;
    }
  };

  const refreshUser = async () => {
    if (session?.user?.id) {
      queryClient.invalidateQueries({ queryKey: ['user', session.user.id] });
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        
        if (session?.user) {
          queryClient.invalidateQueries({ queryKey: ['user', session.user.id] });
        } else {
          queryClient.clear();
        }
        
        setLoading(false);
      }
    );

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
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
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
      cleanupAuthState();
      
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName
          }
        }
      });

      return { error };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      cleanupAuthState();
      queryClient.clear();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.log('Global signout failed, continuing...');
      }
      
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
      window.location.href = '/auth';
    }
  };

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
