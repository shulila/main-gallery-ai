
/**
 * Authentication service for MainGallery.AI Chrome Extension
 * מודול מרכזי לניהול אימות משתמשים
 */

import { logger } from './logger.js';
import { storage, STORAGE_KEYS } from './storage.js';

// Supabase configuration
const SUPABASE_URL = 'https://ovhriawcqvcpagcaidlb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92aHJpYXdjcXZjcGFnY2FpZGxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTQ1MzQwMDAsImV4cCI6MjAxMDExMDAwMH0.qmJ_BHGaVWoVLnkSLDLiDxQGTALQZqODSPTwDgLqJWo';

// Authentication service
export const authService = {
  /**
   * Get current session
   * @returns {Promise<Object|null>} Session object or null if not authenticated
   */
  getSession: async function()  {
    try {
      const session = await storage.get(STORAGE_KEYS.SESSION);
      
      if (!session) {
        return null;
      }
      
      // Check if session is expired
      if (session.expires_at && new Date(session.expires_at) < new Date()) {
        logger.log('Session expired');
        await this.signOut(); // Clean up expired session
        return null;
      }
      
      return session;
    } catch (error) {
      logger.error('Error getting session:', error);
      return null;
    }
  },
  
  /**
   * Get current user
   * @returns {Promise<Object|null>} User object or null if not authenticated
   */
  getUser: async function() {
    try {
      return await storage.get(STORAGE_KEYS.USER);
    } catch (error) {
      logger.error('Error getting user:', error);
      return null;
    }
  },
  
  /**
   * Check if user is authenticated
   * @returns {Promise<boolean>} True if authenticated, false otherwise
   */
  isAuthenticated: async function() {
    const session = await this.getSession();
    return !!session;
  },
  
  /**
   * Sign in with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<{success: boolean, error?: string, user?: Object}>} Result
   */
  signInWithEmailPassword: async function(email, password) {
    try {
      logger.log('Signing in with email and password');
      
      if (!email || !password) {
        return {
          success: false,
          error: 'Email and password are required'
        };
      }
      
      // Call Supabase API
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error_description || errorData.message || 'Failed to sign in');
      }
      
      const data = await response.json();
      
      // Create session object
      const session = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
        provider: 'email',
        user: data.user
      };
      
      // Store session and user
      await storage.set(STORAGE_KEYS.SESSION, session);
      await storage.set(STORAGE_KEYS.USER, data.user);
      
      // Trigger auth state change
      await this._triggerAuthStateChange('SIGNED_IN', data.user);
      
      logger.log('Successfully signed in with email');
      
      return {
        success: true,
        user: data.user
      };
    } catch (error) {
      logger.error('Error signing in with email and password:', error);
      return {
        success: false,
        error: error.message || 'Failed to sign in with email and password'
      };
    }
  },
  
  /**
   * Sign in with Google
   * @returns {Promise<{success: boolean, error?: string, user?: Object}>} Result
   */
  signInWithGoogle: async function() {
    try {
      logger.log('Initiating Google sign in');
      
      return new Promise((resolve) => {
        chrome.identity.getAuthToken({ interactive: true }, async (token) => {
          if (chrome.runtime.lastError) {
            logger.error('Chrome identity error:', chrome.runtime.lastError);
            return resolve({
              success: false,
              error: chrome.runtime.lastError.message || 'Failed to get Google authentication token'
            });
          }
          
          if (!token) {
            logger.error('No token returned from Chrome Identity API');
            return resolve({
              success: false,
              error: 'No authentication token received from Google'
            });
          }
          
          try {
            // Get user info from Google
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
            
            if (!userInfoResponse.ok) {
              throw new Error(`Failed to get user info: ${userInfoResponse.status}`);
            }
            
            const userInfo = await userInfoResponse.json();
            
            // Create user object
            const user = {
              id: userInfo.sub,
              email: userInfo.email,
              app_metadata: { provider: 'google' },
              user_metadata: {
                full_name: userInfo.name,
                avatar_url: userInfo.picture
              }
            };
            
            // Create session object
            const session = {
              access_token: token,
              refresh_token: null,
              expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
              provider: 'google',
              provider_token: token,
              user: user
            };
            
            // Store session and user
            await storage.set(STORAGE_KEYS.SESSION, session);
            await storage.set(STORAGE_KEYS.USER, user);
            
            // Trigger auth state change
            await this._triggerAuthStateChange('SIGNED_IN', user);
            
            logger.log('Successfully signed in with Google');
            
            resolve({
              success: true,
              user: user
            });
          } catch (error) {
            logger.error('Error in Google sign in process:', error);
            
            // Revoke token on error
            chrome.identity.removeCachedAuthToken({ token });
            
            resolve({
              success: false,
              error: error.message || 'Failed to sign in with Google'
            });
          }
        });
      });
    } catch (error) {
      logger.error('Error in Google sign in process:', error);
      return {
        success: false,
        error: error.message || 'Failed to sign in with Google'
      };
    }
  },
  
  /**
   * Process Google OAuth callback URL
   * @param {string} url - Callback URL with access_token
   * @returns {Promise<{success: boolean, error?: string, user?: Object}>} Result
   */
  processGoogleCallback: async function(url) {
    try {
      logger.log('Processing Google callback URL');
      
      if (!url) {
        return {
          success: false,
          error: 'No URL provided'
        };
      }
      
      // Extract token from URL
      const token = this._extractTokenFromUrl(url);
      
      if (!token) {
        return {
          success: false,
          error: 'No token found in URL'
        };
      }
      
      try {
        // Get user info from Google
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${token.access_token}`
          }
        });
        
        if (!userInfoResponse.ok) {
          throw new Error(`Failed to get user info: ${userInfoResponse.status}`);
        }
        
        const userInfo = await userInfoResponse.json();
        
        // Create user object
        const user = {
          id: userInfo.sub,
          email: userInfo.email,
          app_metadata: { provider: 'google' },
          user_metadata: {
            full_name: userInfo.name,
            avatar_url: userInfo.picture
          }
        };
        
        // Create session object
        const session = {
          access_token: token.access_token,
          refresh_token: null,
          expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
          provider: 'google',
          provider_token: token.access_token,
          user: user
        };
        
        // Store session and user
        await storage.set(STORAGE_KEYS.SESSION, session);
        await storage.set(STORAGE_KEYS.USER, user);
        
        // Trigger auth state change
        await this._triggerAuthStateChange('SIGNED_IN', user);
        
        logger.log('Successfully processed Google callback');
        
        return {
          success: true,
          user: user
        };
      } catch (error) {
        logger.error('Error processing Google callback:', error);
        return {
          success: false,
          error: error.message || 'Failed to process Google callback'
        };
      }
    } catch (error) {
      logger.error('Error processing Google callback:', error);
      return {
        success: false,
        error: error.message || 'Failed to process Google callback'
      };
    }
  },
  
  /**
   * Sign out
   * @returns {Promise<{success: boolean, error?: string}>} Result
   */
  signOut: async function() {
    try {
      logger.log('Signing out');
      
      // Get current session
      const session = await this.getSession();
      
      // Revoke Google token if present
      if (session?.provider === 'google' && session.provider_token) {
        try {
          chrome.identity.removeCachedAuthToken({ token: session.provider_token });
        } catch (error) {
          logger.warn('Error removing cached auth token:', error);
        }
      }
      
      // Clear session and user
      await storage.remove(STORAGE_KEYS.SESSION);
      await storage.remove(STORAGE_KEYS.USER);
      
      // Trigger auth state change
      await this._triggerAuthStateChange('SIGNED_OUT');
      
      logger.log('Successfully signed out');
      
      return { success: true };
    } catch (error) {
      logger.error('Error signing out:', error);
      return {
        success: false,
        error: error.message || 'Failed to sign out'
      };
    }
  },
  
  /**
   * Check if URL is a Google OAuth callback
   * @param {string} url - URL to check
   * @returns {boolean} True if URL is a callback URL
   */
  isCallbackUrl: function(url) {
    if (!url) return false;
    
    return url.includes('callback') && 
           (url.includes('access_token=') || url.includes('code='));
  },
  
  /**
   * Extract token from callback URL
   * @param {string} url - Callback URL
   * @returns {Object|null} Token object or null if not found
   */
  _extractTokenFromUrl: function(url) {
    try {
      if (!url) return null;
      
      // Parse the URL
      const urlObj = new URL(url);
      
      // Check if we have a hash fragment with the token
      if (urlObj.hash) {
        // Remove the leading # and parse the parameters
        const params = new URLSearchParams(urlObj.hash.substring(1));
        
        // Extract token data
        const accessToken = params.get('access_token');
        const tokenType = params.get('token_type');
        const expiresIn = params.get('expires_in');
        
        if (!accessToken) {
          return null;
        }
        
        return {
          access_token: accessToken,
          token_type: tokenType || 'Bearer',
          expires_in: parseInt(expiresIn) || 3600
        };
      }
      
      return null;
    } catch (error) {
      logger.error('Error extracting token from URL:', error);
      return null;
    }
  },
  
  /**
   * Trigger auth state change event
   * @param {string} event - Event type (SIGNED_IN, SIGNED_OUT)
   * @param {Object} [user] - User object for SIGNED_IN event
   * @returns {Promise<void>}
   */
  _triggerAuthStateChange: async function(event, user) {
    try {
      // Store event in storage
      await storage.set(STORAGE_KEYS.AUTH_EVENT, { event, user, timestamp: Date.now() });
      
      // Send message to all extension components
      chrome.runtime.sendMessage({
        type: 'AUTH_STATE_CHANGE',
        event,
        user
      }).catch(err => {
        // Ignore errors from no listeners
        if (!err.message?.includes('Could not establish connection')) {
          logger.error('Error broadcasting auth state change:', err);
        }
      });
    } catch (error) {
      logger.error('Error triggering auth state change:', error);
    }
  },
  
  /**
   * Set up auth state change listener
   * @param {Function} callback - Function to call when auth state changes
   * @returns {Function} Function to remove listener
   */
  onAuthStateChange: function(callback) {
    const listener = (changes, areaName) => {
      if (areaName !== 'local') return;
      
      if (changes[STORAGE_KEYS.AUTH_EVENT]) {
        const newValue = changes[STORAGE_KEYS.AUTH_EVENT].newValue;
        if (newValue) {
          callback(newValue.event, newValue.user);
        }
      }
    };
    
    chrome.storage.onChanged.addListener(listener);
    
    // Return function to remove listener
    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }
};
