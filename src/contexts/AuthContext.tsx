import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient, Session, User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

// Updated with actual Supabase credentials
const supabaseUrl = 'https://ovhriawcqvcpagcaidlb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92aHJpYXdjcXZjcGFnY2FpZGxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2MDQxNzMsImV4cCI6MjA1ODE4MDE3M30.Hz5AA2WF31w187GkEOtKJCpoEi6JDcrdZ-dDv6d8Z7U';

// Get the correct production URL for auth redirects - NEVER use localhost
const getProductionAuthRedirectUrl = () => {
  if (typeof window !== 'undefined') {
    // Use the current hostname for development/preview environments
    if (window.location.hostname.includes('lovableproject.com') || 
        window.location.hostname === 'localhost' || 
        window.location.hostname.includes('127.0.0.1')) {
      return `${window.location.origin}/auth/callback`;
    }
  }
  
  // Always fallback to production URL for all other environments
  return 'https://main-gallery-ai.lovable.app/auth/callback';
};

// Updated Google OAuth Client ID for MainGalleryAI
const GOOGLE_CLIENT_ID = '648580197357-2v9sfcorca7060e4rdjr1904a4f1qa26.apps.googleusercontent.com';

// Create a single Supabase client instance to be used throughout the app
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    flowType: 'pkce',
  }
});

// For debugging purposes
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase client initialized');
console.log('Auth redirect URL:', getProductionAuthRedirectUrl());
console.log('Google Client ID:', GOOGLE_CLIENT_ID);

// Improved Google OAuth URL construction using URLSearchParams
const constructGoogleOAuthUrl = (redirectUrl: string) => {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUrl,
    response_type: 'token',
    scope: 'profile email openid',
    include_granted_scopes: 'true',
    prompt: 'consent'
  });
  
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

// Helper function for cleaning up storage during logout
const cleanupStorageData = () => {
  try {
    // Clear localStorage tokens
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('main_gallery_auth_token');
    localStorage.removeItem('main_gallery_user_email');
    
    // Clean up Chrome extension storage if available
    if (typeof window !== 'undefined' && 'chrome' in window && window.chrome?.storage) {
      try {
        window.chrome.storage.sync.remove([
          'main_gallery_auth_token', 
          'main_gallery_user_email'
        ], () => {
          console.log('Chrome storage items removed during logout');
        });
        
        // If local storage also has items, clean those too
        window.chrome.storage.local.remove([
          'main_gallery_auth_token', 
          'main_gallery_user_email'
        ], () => {
          console.log('Chrome local storage items removed during logout');
        });
      } catch (err) {
        console.error('Error cleaning chrome storage:', err);
      }
    }
  } catch (err) {
    console.error('Error during storage cleanup:', err);
  }
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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
      
      try {
        // Set up auth state listener FIRST
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            
            // Also store session info in localStorage for extension to access
            if (session?.user) {
              try {
                localStorage.setItem('main_gallery_user_email', session.user.email || 'User');
                
                // Store token in localStorage for extension to access
                // Calculate expiration time (24 hours from now or use session expiry if available)
                const expiresAt = session.expires_at
                  ? session.expires_at * 1000  // Convert seconds to milliseconds
                  : Date.now() + (24 * 60 * 60 * 1000); // 24 hours
                
                const tokenData = {
                  access_token: session.access_token,
                  refresh_token: session.refresh_token || '',
                  timestamp: Date.now(),
                  expires_at: expiresAt
                };
                
                localStorage.setItem('main_gallery_auth_token', JSON.stringify(tokenData));
                console.log('Stored auth data in localStorage for extension access');
                
                // Also sync to chrome.storage if in extension context
                if (typeof window !== 'undefined' && 'chrome' in window && window.chrome?.storage) {
                  try {
                    window.chrome.storage.sync.set({
                      'main_gallery_auth_token': tokenData,
                      'main_gallery_user_email': session.user.email || 'User'
                    }, () => {
                      console.log('Auth data synced to chrome.storage');
                    });
                  } catch (err) {
                    console.error('Error syncing to chrome.storage:', err);
                  }
                }
              } catch (err) {
                console.error('Error storing user email:', err);
              }
            } else {
              // If no session, clear localStorage
              cleanupStorageData();
            }
          }
        );
        
        // THEN check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        
        // Also store email in localStorage for extension to access
        if (session?.user) {
          try {
            localStorage.setItem('main_gallery_user_email', session.user.email || 'User');
            
            // Store token in localStorage for extension to access
            // Calculate expiration time (24 hours from now or use session expiry if available)
            const expiresAt = session.expires_at
              ? session.expires_at * 1000  // Convert seconds to milliseconds
              : Date.now() + (24 * 60 * 60 * 1000); // 24 hours
            
            const tokenData = {
              access_token: session.access_token,
              refresh_token: session.refresh_token || '',
              timestamp: Date.now(),
              expires_at: expiresAt
            };
            
            localStorage.setItem('main_gallery_auth_token', JSON.stringify(tokenData));
            console.log('Stored auth data in localStorage for extension access');
            
            // Also sync to chrome.storage if in extension context
            if (typeof window !== 'undefined' && 'chrome' in window && window.chrome?.storage) {
              try {
                window.chrome.storage.sync.set({
                  'main_gallery_auth_token': tokenData,
                  'main_gallery_user_email': session.user.email || 'User'
                }, () => {
                  console.log('Auth data synced to chrome.storage');
                });
              } catch (err) {
                console.error('Error syncing to chrome.storage:', err);
              }
            }
          } catch (err) {
            console.error('Error storing user data:', err);
          }
        }
        
        // Also check for token in localStorage and try to restore session if Supabase session is missing
        if (!session) {
          try {
            const tokenStr = localStorage.getItem('main_gallery_auth_token');
            if (tokenStr) {
              const tokenData = JSON.parse(tokenStr);
              
              // Check if token is valid and not expired
              const hasExpiry = tokenData.expires_at !== undefined;
              const isExpired = hasExpiry && Date.now() > tokenData.expires_at;
              
              if (tokenData.access_token && !isExpired) {
                console.log('Found valid token in localStorage, restoring session');
                
                // Try to restore Supabase session with the token
                const { data, error } = await supabase.auth.setSession({
                  access_token: tokenData.access_token,
                  refresh_token: tokenData.refresh_token || ''
                });
                
                if (error) {
                  console.error('Error restoring session from localStorage token:', error);
                  
                  // Clean up storage if token is invalid
                  cleanupStorageData();
                } else if (data?.session) {
                  console.log('Successfully restored session from localStorage token');
                  // No need to set session/user state as onAuthStateChange will handle it
                }
              } else if (isExpired) {
                console.log('Found expired token in localStorage, removing it');
                cleanupStorageData();
              }
            }
          } catch (err) {
            console.error('Error checking localStorage for token:', err);
          }
        }
        
        return () => subscription.unsubscribe();
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
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

  const resetPassword = async (email: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `https://main-gallery-ai.lovable.app/auth?tab=login`,
      });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Password reset email sent",
        description: "Check your inbox for a link to reset your password",
      });
    } catch (error: any) {
      toast({
        title: "Password reset failed",
        description: error.message || "Unable to send password reset email",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      
      // Always use the production URL for the redirect, never use window.location.origin
      const redirectUrl = getProductionAuthRedirectUrl();
      
      console.log('Starting Google login with redirect to:', redirectUrl);
      console.log('Using Google Client ID:', GOOGLE_CLIENT_ID);
      
      // Try direct Google auth if available in Chrome extension context
      if (typeof window !== 'undefined' && 'chrome' in window && window.chrome?.runtime) {
        console.log('Chrome runtime detected, attempting to use extension auth flow');
        
        try {
          // Send message to extension background script to handle auth
          window.chrome.runtime.sendMessage(
            undefined, // extensionId parameter (undefined for own extension)
            { action: 'googleLogin' }, // message parameter
            (response) => { // callback parameter
              if (window.chrome?.runtime.lastError) {
                console.error('Error with extension auth:', window.chrome.runtime.lastError);
                // Fall back to standard OAuth flow
                window.location.href = constructGoogleOAuthUrl(redirectUrl);
              } else if (response && response.success) {
                console.log('Google login initiated through extension');
                // Success will be handled via auth state change
              } else {
                console.error('Extension auth failed:', response?.error);
                // Fall back to standard OAuth flow
                window.location.href = constructGoogleOAuthUrl(redirectUrl);
              }
            }
          );
        } catch (err) {
          console.error('Error with extension-based auth:', err);
          // Fall back to standard OAuth flow
          window.location.href = constructGoogleOAuthUrl(redirectUrl);
        }
      } else {
        // Standard web flow - use the improved OAuth URL construction
        const googleOAuthUrl = constructGoogleOAuthUrl(redirectUrl);
        
        // Log the URL for debugging
        console.log('Constructed OAuth URL:', googleOAuthUrl);
        
        // Navigate to Google OAuth URL
        window.location.href = googleOAuthUrl;
      }
      
      // No need for error handling here since we're navigating away
    } catch (error: any) {
      console.error('Google login error:', error);
      toast({
        title: "Google login failed",
        description: error.message || "Could not authenticate with Google",
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
      
      // First attempt to log out of Chrome extension if we're in that context
      let extensionLogoutAttempted = false;
      
      if (typeof window !== 'undefined' && 'chrome' in window && window.chrome?.runtime) {
        try {
          console.log('Attempting to logout from Chrome extension');
          
          // Use a promise to handle the extension logout with timeout
          await new Promise<void>((resolve) => {
            const timeoutId = setTimeout(() => {
              console.warn('Extension logout timed out');
              resolve(); // Continue anyway after timeout
            }, 3000);
            
            try {
              window.chrome.runtime.sendMessage(
                undefined, // extensionId parameter (undefined for own extension)
                { action: 'logout' }, // message parameter
                (response) => { // callback parameter
                  clearTimeout(timeoutId);
                  if (window.chrome?.runtime.lastError) {
                    console.error('Error with extension logout:', window.chrome.runtime.lastError);
                    resolve(); // Continue anyway despite error
                  } else {
                    console.log('Extension logout response:', response);
                    extensionLogoutAttempted = true;
                    resolve(); // Continue with Supabase logout
                  }
                }
              );
            } catch (err) {
              clearTimeout(timeoutId);
              console.error('Exception sending logout message to extension:', err);
              resolve(); // Continue anyway despite error
            }
          });
        } catch (err) {
          console.error('Error in extension logout process:', err);
          // Continue with Supabase logout regardless
        }
      }
      
      // Always clean storage before Supabase logout
      cleanupStorageData();
      
      // Then perform Supabase logout - using try/catch to handle errors
      try {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
          console.error('Supabase signOut error:', error);
          // Even with error, continue with session cleanup
        }
        
        console.log('Successfully logged out from Supabase');
      } catch (supabaseError) {
        console.error('Exception during Supabase logout:', supabaseError);
        // Continue with cleanup even if Supabase logout fails
      }
      
      // Force state reset regardless of API success
      setSession(null);
      setUser(null);
      
      // Clean storage again as a safety measure
      cleanupStorageData();
      
      toast({
        title: "Logged out successfully",
      });
    } catch (error: any) {
      console.error('Error during logout process:', error);
      toast({
        title: "Error signing out",
        description: error.message || "Failed to log out completely, but your local session has been cleared",
        variant: "destructive",
      });
      
      // Force clear session state and storage
      setSession(null);
      setUser(null);
      cleanupStorageData();
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
    signOut,
    signInWithGoogle,
    resetPassword
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
