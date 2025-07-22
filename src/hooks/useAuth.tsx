import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Define Profile type directly instead of using Database types
interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  country: string | null;
  role: 'super_admin' | 'league_admin' | 'player';
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper function to create or update profile
  const createOrUpdateProfile = async (user: User, metadata?: any) => {
    try {
      // First check if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error checking for existing profile:', fetchError);
        return null;
      }
      
      if (existingProfile) {
        // Profile exists, update it with any new metadata
        const updates: any = {};
        if (metadata?.fullName) updates.full_name = metadata.fullName;
        if (metadata?.phone) updates.phone = metadata.phone;
        if (metadata?.country) updates.country = metadata.country;
        if (metadata?.role) updates.role = metadata.role;
        
        // Only update if we have changes
        if (Object.keys(updates).length > 0) {
          const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single();
            
          if (error) throw error;
          return data;
        }
        
        return existingProfile;
      } else {
        // Profile doesn't exist, create it
        const { data, error } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: metadata?.fullName || '',
            email: user.email || '',
            phone: metadata?.phone || '',
            country: metadata?.country || '',
            role: metadata?.role || 'player'
            // Removed is_approved field as it might not exist in the database
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error creating/updating profile:', error);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user profile
          setTimeout(async () => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            if (profileData) {
              setProfile(profileData);
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              // Profile doesn't exist, create it from user metadata
              const metadata = session.user.user_metadata;
              const newProfile = await createOrUpdateProfile(session.user, metadata);
              if (newProfile) {
                setProfile(newProfile);
              }
            }
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata?: any) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata
      }
    });
    
    // If signup successful and user is immediately available (email confirmation disabled)
    if (!error && data.user && data.user.email_confirmed_at) {
      // Create profile immediately
      const newProfile = await createOrUpdateProfile(data.user, metadata);
      if (newProfile) {
        setProfile(newProfile);
      }
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    return { error };
  };

  const signOut = async () => {
    try {
      // Use the local scope option instead of global to avoid 403 errors
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
        console.error('Error signing out:', error);
      }
      // Explicitly clear profile state
      setProfile(null);
      setUser(null);
      setSession(null);
      
      // Force a page reload to clear any cached state
      window.location.href = '/';
    } catch (error) {
      console.error('Exception during sign out:', error);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('No user logged in') };
    
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);
    
    if (!error && profile) {
      setProfile({ ...profile, ...updates });
    }
    
    return { error };
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
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