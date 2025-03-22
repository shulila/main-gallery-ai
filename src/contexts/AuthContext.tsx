
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient, Session, User } from '@supabase/supabase-js';
import { useToast } from '@/components/ui/use-toast';

// Updated with actual Supabase credentials
const supabaseUrl = 'https://ovhriawcqvcpagcaidlb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92aHJpYXdjcXZjcGFnY2FpZGxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2MDQxNzMsImV4cCI6MjA1ODE4MDE3M30.Hz5AA2WF31w187GkEOtKJCpoEi6JDcrdZ-dDv6d8Z7U';

// Create a single Supabase client instance to be used throughout the app
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// For debugging purposes
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase client initialized');

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize the auth state
    const initializeAuth = async () => {
      setIsLoading(true);
      
      // Get the current session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error retrieving session:', error);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      
      setIsLoading(false);
      
      // Set up auth state listener
      const { data: authListener } = supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          setSession(newSession);
          setUser(newSession?.user ?? null);
        }
      );
      
      return () => {
        authListener.subscription.unsubscribe();
      };
    };
    
    initializeAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log('Attempting to sign in with:', email);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signUp({ email, password });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Sign up successful",
        description: "Please check your email to confirm your account",
      });
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message || "Please check your information and try again",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Logged out successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    session,
    user,
    isLoading,
    signIn,
    signUp,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
