
/**
 * Supabase client wrapper for Chrome Extension
 * Service Worker compatible implementation
 */

// Using hardcoded values for the extension
const SUPABASE_URL = "https://ovhriawcqvcpagcaidlb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92aHJpYXdjcXZjcGFnY2FpZGxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2MDQxNzMsImV4cCI6MjA1ODE4MDE3M30.Hz5AA2WF31w187GkEOtKJCpoEi6JDcrdZ-dDv6d8Z7U";

import { logger } from './logger.js';
import { storage, STORAGE_KEYS } from './storage.js';
import { authService } from './auth-service.js';

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
    
    // Add setSession functionality that was missing
    setSession: async (session) => {
      try {
        if (!session) {
          await storage.remove(STORAGE_KEYS.SESSION);
          await storage.remove(STORAGE_KEYS.USER);
          return { error: null };
        }
        
        await storage.set(STORAGE_KEYS.SESSION, session);
        if (session.user) {
          await storage.set(STORAGE_KEYS.USER, session.user);
        }
        
        // Trigger auth state change event
        if (authService._triggerAuthStateChange) {
          await authService._triggerAuthStateChange('SESSION_UPDATED', session.user);
        }
        
        return { data: { session }, error: null };
      } catch (error) {
        logger.error('Error in supabase.auth.setSession:', error);
        return { error };
      }
    },
    
    signInWithPassword: async (email, password) => {
      try {
        const result = await authService.signInWithEmailPassword(email, password);
        if (result.success) {
          return { data: { user: result.user, session: await authService.getSession() }, error: null };
        } else {
          return { data: { user: null, session: null }, error: new Error(result.error) };
        }
      } catch (error) {
        logger.error('Error in supabase.auth.signInWithPassword:', error);
        return { data: { user: null, session: null }, error };
      }
    },
    
    signInWithOAuth: async ({ provider }) => {
      try {
        if (provider === 'google') {
          const result = await authService.signInWithGoogle();
          if (result.success) {
            return { data: { provider: 'google', user: result.user }, error: null };
          } else {
            return { data: null, error: new Error(result.error) };
          }
        } else {
          return { data: null, error: new Error(`Provider ${provider} not supported`) };
        }
      } catch (error) {
        logger.error('Error in supabase.auth.signInWithOAuth:', error);
        return { data: null, error };
      }
    },
    
    signOut: async () => {
      try {
        const result = await authService.signOut();
        if (result.success) {
          return { error: null };
        } else {
          return { error: new Error(result.error) };
        }
      } catch (error) {
        logger.error('Error in supabase.auth.signOut:', error);
        return { error };
      }
    },
    
    onAuthStateChange: (callback) => {
      // Set up listener using our auth service
      const unsubscribe = authService.onAuthStateChange((event, user) => {
        // Map events to Supabase format
        let supabaseEvent = event === 'SIGNED_IN' ? 'SIGNED_IN' : 
                            event === 'SIGNED_OUT' ? 'SIGNED_OUT' : 'USER_UPDATED';
        
        // Call the callback with the mapped event
        callback(supabaseEvent, { user });
      });
      
      // Return a function to remove the listener
      return { data: { subscription: { unsubscribe } } };
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
