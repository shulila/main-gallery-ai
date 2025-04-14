
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

// Create a service worker compatible client
const supabaseClient = {
  auth: {
    getSession: async () => {
      try {
        return await authService.getSession();
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
    },
    
    // Handle OAuth token (for compatibility with callback-handler.js)
    handleOAuthToken: async (token, provider) => {
      try {
        // If we have a token but no URL, create a mock callback URL
        if (token && typeof token === 'string') {
          const url = `https://example.com/callback#access_token=${token}&token_type=bearer&expires_in=3600`;
          const result = await authService.processGoogleCallback(url);
          
          if (result.success) {
            return { data: { user: result.user, session: await authService.getSession() }, error: null };
          } else {
            return { data: null, error: new Error(result.error) };
          }
        } else if (typeof token === 'object' && token.access_token) {
          // Handle token object directly
          const session = {
            access_token: token.access_token,
            refresh_token: token.refresh_token || null,
            provider: provider || 'google',
            expires_at: token.expires_at || new Date(Date.now() + 3600 * 1000).toISOString()
          };
          
          // Store the session
          await storage.set(STORAGE_KEYS.SESSION, session);
          
          // Get user info if needed
          if (!token.user) {
            try {
              const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${token.access_token}` }
              });
              
              if (userInfoResponse.ok) {
                const userInfo = await userInfoResponse.json();
                const user = {
                  id: userInfo.sub,
                  email: userInfo.email,
                  user_metadata: {
                    full_name: userInfo.name,
                    avatar_url: userInfo.picture
                  }
                };
                
                // Update session with user
                session.user = user;
                await storage.set(STORAGE_KEYS.SESSION, session);
                await storage.set(STORAGE_KEYS.USER, user);
                
                // Trigger auth state change
                await authService._triggerAuthStateChange('SIGNED_IN', user);
                
                return { data: { user, session }, error: null };
              }
            } catch (error) {
              logger.error('Error getting user info:', error);
            }
          }
          
          return { data: { session }, error: null };
        }
        
        return { data: null, error: new Error('Invalid token format') };
      } catch (error) {
        logger.error('Error in handleOAuthToken:', error);
        return { data: null, error };
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
