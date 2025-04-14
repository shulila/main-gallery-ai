
/**
 * Authentication service for MainGallery.AI Chrome Extension
 */

import { logger } from './logger.js';
import { storage, STORAGE_KEYS } from './storage.js';
import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES, WEB_APP_URLS } from './oauth-config.js';
import { syncAuthState, removeAuthCookies } from './cookie-sync.js';

// Authentication service
export const authService = {
  /**
   * Get current session
   * @returns {Promise<Object|null>} Session object or null if not authenticated
   */
  getSession: async function() {
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
      
      // For the Chrome extension, we'll redirect to the web app for email/password auth
      chrome.tabs.create({ url: WEB_APP_URLS.AUTH });
      
      return {
        success: false,
        error: 'Email sign-in is handled through the web app'
      };
    } catch (error) {
      logger.error('Error signing in with email:', error);
      return {
        success: false,
        error: error.message || 'An error occurred during sign in'
      };
    }
  },
  
  /**
   * Sign in with Google using Chrome Identity API
   * @returns {Promise<{success: boolean, error?: string, user?: Object}>}
   */
  signInWithGoogle: async function() {
    try {
      logger.log('Signing in with Google via Chrome Identity API');
      
      // Use Chrome Identity API to get Google auth token
      const token = await new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
          if (chrome.runtime.lastError) {
            logger.error('Chrome Identity API error:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(token);
          }
        });
      });
      
      if (!token) {
        logger.error('No token received from Chrome Identity API');
        return {
          success: false,
          error: 'Failed to get authentication token from Google'
        };
      }
      
      logger.log('Successfully got token from Chrome Identity API');
      
      // Get user info from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          'Authorization': `Bearer ${token}`
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
        user_metadata: {
          full_name: userInfo.name,
          avatar_url: userInfo.picture
        },
        app_metadata: {
          provider: 'google'
        }
      };
      
      // Create session object
      const session = {
        provider: 'google',
        provider_token: token,
        access_token: token,
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour expiry
        user: user
      };
      
      // Save session and user data
      await storage.set(STORAGE_KEYS.SESSION, session);
      await storage.set(STORAGE_KEYS.USER, user);
      
      // Sync with web app
      await syncAuthState();
      
      logger.log('Google authentication successful');
      
      return {
        success: true,
        user: user
      };
    } catch (error) {
      logger.error('Error signing in with Google:', error);
      return {
        success: false,
        error: error.message || 'An error occurred during Google authentication'
      };
    }
  },
  
  /**
   * Process Google callback URL
   * @param {string} url - Callback URL with access token
   * @returns {Promise<{success: boolean, error?: string, user?: Object}>}
   */
  processGoogleCallback: async function(url) {
    try {
      logger.log('Processing Google callback URL');
      
      if (!url) {
        return {
          success: false,
          error: 'No callback URL provided'
        };
      }
      
      // Extract access token from URL
      let accessToken = '';
      
      // Check hash parameters first (#access_token=...)
      const hashParams = new URLSearchParams(url.split('#')[1] || '');
      accessToken = hashParams.get('access_token') || '';
      
      // If not in hash, check query parameters (?access_token=...)
      if (!accessToken) {
        const queryParams = new URLSearchParams(url.split('?')[1] || '');
        accessToken = queryParams.get('access_token') || '';
      }
      
      if (!accessToken) {
        return {
          success: false,
          error: 'No access token found in callback URL'
        };
      }
      
      // Get user info from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!userInfoResponse.ok) {
        return {
          success: false,
          error: `Failed to get user info: ${userInfoResponse.status}`
        };
      }
      
      const userInfo = await userInfoResponse.json();
      
      // Create user and session objects
      const user = {
        id: userInfo.sub,
        email: userInfo.email,
        user_metadata: {
          full_name: userInfo.name,
          avatar_url: userInfo.picture
        },
        app_metadata: {
          provider: 'google'
        }
      };
      
      const session = {
        provider: 'google',
        provider_token: accessToken,
        access_token: accessToken,
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour expiry
        user: user
      };
      
      // Save session and user data
      await storage.set(STORAGE_KEYS.SESSION, session);
      await storage.set(STORAGE_KEYS.USER, user);
      
      // Sync with web app
      await syncAuthState();
      
      logger.log('Google callback processing successful');
      
      return {
        success: true,
        user: user
      };
    } catch (error) {
      logger.error('Error processing Google callback:', error);
      return {
        success: false,
        error: error.message || 'An error occurred during Google authentication'
      };
    }
  },
  
  /**
   * Sign out the current user
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  signOut: async function() {
    try {
      logger.log('Signing out');
      
      // Get current session
      const session = await this.getSession();
      
      // Remove auth cookies from web app
      await removeAuthCookies();
      
      // If signed in with Google, revoke token
      if (session && session.provider === 'google' && session.provider_token) {
        try {
          // Revoke the token
          chrome.identity.removeCachedAuthToken({ token: session.provider_token }, () => {
            logger.log('Removed cached auth token');
          });
        } catch (error) {
          logger.warn('Error revoking Google token:', error);
          // Continue with sign out even if token revocation fails
        }
      }
      
      // Clear all auth related data
      await storage.remove(STORAGE_KEYS.SESSION);
      await storage.remove(STORAGE_KEYS.USER);
      
      return {
        success: true
      };
    } catch (error) {
      logger.error('Error signing out:', error);
      return {
        success: false,
        error: error.message || 'An error occurred during sign out'
      };
    }
  }
};
