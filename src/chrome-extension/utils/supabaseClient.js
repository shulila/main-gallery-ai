
/**
 * Supabase client wrapper for Chrome Extension
 * Service Worker compatible implementation with improved error handling
 */

// Using hardcoded values for the extension
const SUPABASE_URL = "https://ovhriawcqvcpagcaidlb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92aHJpYXdjcXZjcGFnY2FpZGxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2MDQxNzMsImV4cCI6MjA1ODE4MDE3M30.Hz5AA2WF31w187GkEOtKJCpoEi6JDcrdZ-dDv6d8Z7U";

import { logger } from './logger.js';
import { storage, STORAGE_KEYS } from './storage.js';
import { authService } from './auth/auth-service.js';

// Create a service worker compatible client with enhanced support for setSession
const supabaseClient = {
  auth: {
    getSession: async () => {
      try {
        const session = await authService.getSession();
        return { data: { session }, error: null };
      } catch (error) {
        logger.error('Error in supabase.auth.getSession:', error);
        return { data: { session: null }, error };
      }
    },
    
    getUser: async () => {
      try {
        const user = await authService.getUser();
        return { data: { user }, error: null };
      } catch (error) {
        logger.error('Error in supabase.auth.getUser:', error);
        return { data: { user: null }, error };
      }
    },
    
    // Enhanced setSession functionality with better error handling
    setSession: async (session) => {
      try {
        logger.log('Setting session in supabaseClient');
        
        if (!session) {
          await storage.remove(STORAGE_KEYS.SESSION);
          await storage.remove(STORAGE_KEYS.USER);
          return { error: null };
        }
        
        await storage.set(STORAGE_KEYS.SESSION, session);
        if (session.user) {
          await storage.set(STORAGE_KEYS.USER, session.user);
        } else {
          logger.warn('Session without user information');
        }
        
        // Trigger auth state change event
        try {
          if (authService._triggerAuthStateChange) {
            await authService._triggerAuthStateChange('SESSION_UPDATED', session.user || null);
          }
        } catch (eventError) {
          logger.warn('Error triggering auth state change:', eventError);
          // Continue anyway
        }
        
        return { data: { session }, error: null };
      } catch (error) {
        logger.error('Error in supabase.auth.setSession:', error);
        return { error };
      }
    },
    
    signInWithPassword: async (email, password) => {
      try {
        if (!email || !password) {
          return { 
            data: { user: null, session: null }, 
            error: new Error('Email and password are required') 
          };
        }
        
        const result = await authService.signInWithEmailPassword(email, password);
        if (result.success) {
          const session = await authService.getSession();
          return { data: { user: result.user, session }, error: null };
        } else {
          return { 
            data: { user: null, session: null }, 
            error: new Error(result.error || 'Authentication failed') 
          };
        }
      } catch (error) {
        logger.error('Error in supabase.auth.signInWithPassword:', error);
        return { 
          data: { user: null, session: null }, 
          error: error instanceof Error ? error : new Error('Unknown error during sign in') 
        };
      }
    },
    
    signInWithOAuth: async ({ provider }) => {
      try {
        if (provider === 'google') {
          const result = await authService.signInWithGoogle();
          if (result.success) {
            return { data: { provider: 'google', user: result.user }, error: null };
          } else {
            return { 
              data: null, 
              error: new Error(result.error || 'Failed to sign in with Google') 
            };
          }
        } else {
          return { 
            data: null, 
            error: new Error(`Provider ${provider} not supported`) 
          };
        }
      } catch (error) {
        logger.error('Error in supabase.auth.signInWithOAuth:', error);
        return { 
          data: null, 
          error: error instanceof Error ? error : new Error('Unknown error during OAuth sign in')
        };
      }
    },
    
    signOut: async () => {
      try {
        const result = await authService.signOut();
        if (result.success) {
          return { error: null };
        } else {
          return { error: new Error(result.error || 'Sign out failed') };
        }
      } catch (error) {
        logger.error('Error in supabase.auth.signOut:', error);
        return { 
          error: error instanceof Error ? error : new Error('Unknown error during sign out')
        };
      }
    },
    
    onAuthStateChange: (callback) => {
      if (!callback || typeof callback !== 'function') {
        logger.warn('Invalid callback provided to onAuthStateChange');
        return { data: { subscription: { unsubscribe: () => {} } } };
      }
      
      // Set up listener using our auth service
      try {
        const unsubscribe = authService.onAuthStateChange((event, user) => {
          // Map events to Supabase format
          let supabaseEvent = event === 'SIGNED_IN' ? 'SIGNED_IN' : 
                              event === 'SIGNED_OUT' ? 'SIGNED_OUT' : 'USER_UPDATED';
          
          // Call the callback with the mapped event
          try {
            callback(supabaseEvent, { user });
          } catch (callbackError) {
            logger.error('Error in auth state change callback:', callbackError);
          }
        });
        
        // Return a function to remove the listener
        return { data: { subscription: { unsubscribe } } };
      } catch (error) {
        logger.error('Error setting up auth state change listener:', error);
        return { data: { subscription: { unsubscribe: () => {} } } };
      }
    }
  }
};

// Log that this module was loaded
logger.log("supabaseClient.js loaded");

// Export the client
export default supabaseClient; 
export const supabase = supabaseClient;

// Also export config for use in other modules
export const supabaseConfig = {
  url: SUPABASE_URL,
  key: SUPABASE_PUBLISHABLE_KEY
};
