
/**
 * Authentication service for MainGallery.AI Chrome Extension
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
        return {
          success: false,
          error: errorData.error_description || errorData.message || 'Invalid email or password'
        };
      }
      
      const data = await response.json();
      
      // Save session and user data
      await storage.set(STORAGE_KEYS.SESSION, {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + (data.expires_in * 1000),
        user: data.user
      });
      
      await storage.set(STORAGE_KEYS.USER, data.user);
      
      return {
        success: true,
        user: data.user
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
      let refreshToken = '';
      
      // Check hash parameters first (#access_token=...)
      const hashParams = new URLSearchParams(url.split('#')[1] || '');
      accessToken = hashParams.get('access_token') || '';
      refreshToken = hashParams.get('refresh_token') || '';
      
      // If not in hash, check query parameters (?access_token=...)
      if (!accessToken) {
        const queryParams = new URLSearchParams(url.split('?')[1] || '');
        accessToken = queryParams.get('access_token') || '';
        refreshToken = queryParams.get('refresh_token') || '';
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
        provider_refresh_token: refreshToken,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: Date.now() + 3600 * 1000, // 1 hour by default
        user: user
      };
      
      // Save session and user data
      await storage.set(STORAGE_KEYS.SESSION, session);
      await storage.set(STORAGE_KEYS.USER, user);
      
      logger.log('Google authentication successful');
      
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
   * Sign in with Google
   * @returns {Promise<{success: boolean, error?: string, user?: Object}>}
   */
  signInWithGoogle: async function() {
    try {
      logger.log('Initiating Google sign in');
      
      // Generate a random state value for CSRF protection
      const state = Math.random().toString(36).substring(2, 15);
      
      // Store state for verification later
      await storage.set('google_auth_state', state);
      
      // Prepare OAuth URL
      const redirectUri = encodeURIComponent('https://main-gallery-ai.lovable.app/auth/callback');
      const clientId = '648580197357-2v9sfcorca7060e4rdjr1904a4f1qa26.apps.googleusercontent.com';
      const scope = encodeURIComponent('email profile openid');
      
      const oauthUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}&state=${state}`;
      
      // Open OAuth URL in a new tab
      chrome.tabs.create({ url: oauthUrl });
      
      return {
        success: true,
        message: 'Google sign in initiated'
      };
    } catch (error) {
      logger.error('Error initiating Google sign in:', error);
      return {
        success: false,
        error: error.message || 'An error occurred during Google sign in'
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
