
/**
 * Centralized authentication service for MainGallery.AI Chrome Extension
 */

import { logger } from '../../utils/logger.js';
import { handleError, ErrorTypes, withErrorHandling } from '../../utils/error-handler.js';
import { storage } from '../../utils/storage.js';
import { toast } from '../../utils/notifications.js';

// Storage keys
const STORAGE_KEYS = {
  SESSION: 'auth_session',
  USER: 'auth_user',
  STATE: 'auth_state',
  AUTH_NONCE: 'auth_nonce',
  REFRESH_TOKEN: 'auth_refresh_token'
};

// Auth state object
let authState = {
  isAuthenticated: false,
  user: null,
  session: null,
  lastChecked: null,
  isLoading: false
};

/**
 * Authentication service
 */
export const authService = {
  /**
   * Initialize the auth service
   * @returns {Promise<void>}
   */
  initialize: withErrorHandling(async () => {
    logger.info('Initializing auth service');
    
    // Load auth state from storage
    await authService.loadState();
    
    // If we have a session, check if it's still valid
    if (authState.session) {
      await authService.validateSession();
    }
    
    logger.info('Auth service initialized', { 
      isAuthenticated: authState.isAuthenticated 
    });
    
    return { success: true };
  }, 'auth.initialize', { type: ErrorTypes.AUTH }),
  
  /**
   * Check if the user is authenticated
   * @returns {Promise<boolean>} True if the user is authenticated
   */
  isAuthenticated: async () => {
    // If we haven't checked recently, validate the session
    const CACHE_TIME = 5 * 60 * 1000; // 5 minutes
    if (!authState.lastChecked || Date.now() - authState.lastChecked > CACHE_TIME) {
      await authService.validateSession();
    }
    
    return authState.isAuthenticated;
  },
  
  /**
   * Get the current authenticated user
   * @returns {Promise<Object|null>} User object or null if not authenticated
   */
  getUser: async () => {
    if (await authService.isAuthenticated()) {
      return authState.user;
    }
    return null;
  },
  
  /**
   * Get the current session
   * @returns {Promise<Object|null>} Session object or null if not authenticated
   */
  getSession: async () => {
    if (await authService.isAuthenticated()) {
      return authState.session;
    }
    return null;
  },
  
  /**
   * Sign in with Google
   * @returns {Promise<Object>} Result object
   */
  signInWithGoogle: withErrorHandling(async () => {
    logger.info('Starting Google sign-in flow');
    
    // Set loading state
    authState.isLoading = true;
    
    // Generate and store a nonce for security
    const nonce = Math.random().toString(36).substring(2, 15);
    await storage.set(STORAGE_KEYS.AUTH_NONCE, nonce);
    
    // Get client ID from manifest
    const manifest = chrome.runtime.getManifest();
    const clientId = manifest.oauth2?.client_id;
    
    if (!clientId || !clientId.includes('.apps.googleusercontent.com')) {
      throw new Error('Invalid Google client ID configuration');
    }
    
    // Send message to background script
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: 'initiateGoogleAuth', clientId, nonce },
        response => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          if (response?.error) {
            reject(new Error(response.error));
            return;
          }
          
          // Success case - we don't resolve here because the auth flow
          // continues in the background and we'll get a callback later
          logger.info('Google auth flow initiated');
          
          // But we do need to provide some response for the UI
          resolve({ 
            success: true, 
            pendingAuth: true,
            message: 'Google authentication started' 
          });
        }
      );
    });
  }, 'auth.signInWithGoogle', { type: ErrorTypes.AUTH }),
  
  /**
   * Sign in with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Result object
   */
  signInWithEmail: withErrorHandling(async (email, password) => {
    logger.info('Starting email sign-in flow');
    
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    
    // Set loading state
    authState.isLoading = true;
    
    try {
      // Make API request to authenticate
      const response = await fetch('https://main-gallery-ai.lovable.app/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Authentication failed');
      }
      
      const data = await response.json();
      
      if (!data.user || !data.session) {
        throw new Error('Invalid response from server');
      }
      
      // Update auth state
      await authService.setSession(data.session, data.user);
      
      logger.info('Email authentication successful');
      
      return { success: true, user: data.user };
    } finally {
      // Clear loading state
      authState.isLoading = false;
    }
  }, 'auth.signInWithEmail', { type: ErrorTypes.AUTH }),
  
  /**
   * Process authentication result from Google
   * @param {Object} data - Auth data from Google
   * @returns {Promise<Object>} Result object
   */
  processGoogleAuthResult: withErrorHandling(async (data) => {
    logger.info('Processing Google auth result');
    
    // Validate nonce
    const storedNonce = await storage.get(STORAGE_KEYS.AUTH_NONCE);
    if (storedNonce && data.nonce && storedNonce !== data.nonce) {
      throw new Error('Security validation failed');
    }
    
    // Clear stored nonce
    await storage.remove(STORAGE_KEYS.AUTH_NONCE);
    
    if (!data.token) {
      throw new Error('No authentication token received');
    }
    
    // Create session object
    const session = {
      access_token: data.token,
      refresh_token: data.refreshToken,
      provider: 'google',
      expires_at: Date.now() + (data.expiresIn || 3600) * 1000
    };
    
    // Create user object
    const user = {
      id: data.userId || data.sub,
      email: data.email,
      name: data.name || data.email?.split('@')[0] || 'User',
      avatar_url: data.picture || null,
      provider: 'google'
    };
    
    // Update auth state
    await authService.setSession(session, user);
    
    logger.info('Google authentication processed successfully');
    
    return { success: true, user };
  }, 'auth.processGoogleAuthResult', { type: ErrorTypes.AUTH }),
  
  /**
   * Sign out the current user
   * @returns {Promise<Object>} Result object
   */
  signOut: withErrorHandling(async () => {
    logger.info('Signing out');
    
    // Send sign-out request if we have a session
    if (authState.session?.access_token) {
      try {
        await fetch('https://main-gallery-ai.lovable.app/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authState.session.access_token}`
          }
        });
      } catch (error) {
        logger.warn('Error signing out remotely:', error);
        // Continue with local sign-out even if remote fails
      }
    }
    
    // Clear auth state
    authState = {
      isAuthenticated: false,
      user: null,
      session: null,
      lastChecked: Date.now(),
      isLoading: false
    };
    
    // Clear storage
    await storage.remove(STORAGE_KEYS.SESSION);
    await storage.remove(STORAGE_KEYS.USER);
    await storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
    
    // Save cleared state
    await authService.saveState();
    
    logger.info('Sign out successful');
    
    // Notify other parts of the extension
    try {
      chrome.runtime.sendMessage({
        action: 'authStatusChanged',
        isAuthenticated: false
      });
    } catch (error) {
      logger.warn('Error notifying about auth status change:', error);
    }
    
    return { success: true };
  }, 'auth.signOut', { type: ErrorTypes.AUTH }),
  
  /**
   * Validate the current session
   * @returns {Promise<boolean>} True if the session is valid
   */
  validateSession: withErrorHandling(async () => {
    logger.debug('Validating session');
    
    // Update last checked timestamp
    authState.lastChecked = Date.now();
    
    // If we don't have a session, we're not authenticated
    if (!authState.session?.access_token) {
      authState.isAuthenticated = false;
      return false;
    }
    
    // Check if session has expired
    if (authState.session.expires_at && authState.session.expires_at < Date.now()) {
      logger.info('Session expired, attempting refresh');
      
      // Try to refresh the session
      const refreshed = await authService.refreshSession();
      if (!refreshed) {
        authState.isAuthenticated = false;
        return false;
      }
    }
    
    try {
      // Validate session with server
      const response = await fetch('https://main-gallery-ai.lovable.app/api/auth/status', {
        headers: {
          'Authorization': `Bearer ${authState.session.access_token}`
        }
      });
      
      // If not authorized, try refresh once
      if (response.status === 401) {
        logger.warn('Session validation failed with 401, attempting refresh');
        
        const refreshed = await authService.refreshSession();
        if (!refreshed) {
          authState.isAuthenticated = false;
          return false;
        }
        
        // Try again with refreshed token
        const retryResponse = await fetch('https://main-gallery-ai.lovable.app/api/auth/status', {
          headers: {
            'Authorization': `Bearer ${authState.session.access_token}`
          }
        });
        
        if (!retryResponse.ok) {
          logger.warn('Session validation failed after refresh');
          authState.isAuthenticated = false;
          return false;
        }
      } else if (!response.ok) {
        logger.warn(`Session validation failed with status ${response.status}`);
        authState.isAuthenticated = false;
        return false;
      }
      
      // If we got this far, the session is valid
      authState.isAuthenticated = true;
      
      // Update user data if available
      try {
        const data = await response.json();
        if (data.user) {
          authState.user = data.user;
          await storage.set(STORAGE_KEYS.USER, data.user);
        }
      } catch (error) {
        logger.warn('Error parsing user data from validation response:', error);
      }
      
      // Save the updated state
      await authService.saveState();
      
      return true;
    } catch (error) {
      logger.warn('Error validating session:', error);
      
      // Don't immediately invalidate on network errors
      // The session might still be valid
      return authState.isAuthenticated;
    }
  }, 'auth.validateSession', { type: ErrorTypes.AUTH, returnValue: false }),
  
  /**
   * Refresh the current session
   * @returns {Promise<boolean>} True if the session was refreshed
   */
  refreshSession: withErrorHandling(async () => {
    logger.info('Attempting to refresh session');
    
    // If we don't have a refresh token, we can't refresh
    if (!authState.session?.refresh_token) {
      logger.warn('No refresh token available');
      return false;
    }
    
    try {
      // Refresh session with server
      const response = await fetch('https://main-gallery-ai.lovable.app/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refresh_token: authState.session.refresh_token
        })
      });
      
      if (!response.ok) {
        logger.warn(`Session refresh failed with status ${response.status}`);
        return false;
      }
      
      const data = await response.json();
      
      if (!data.access_token) {
        logger.warn('Refresh response missing access token');
        return false;
      }
      
      // Update session
      authState.session = {
        ...authState.session,
        access_token: data.access_token,
        expires_at: Date.now() + (data.expires_in || 3600) * 1000
      };
      
      // If we got a new refresh token, update that too
      if (data.refresh_token) {
        authState.session.refresh_token = data.refresh_token;
      }
      
      // Save the updated session
      await storage.set(STORAGE_KEYS.SESSION, authState.session);
      
      logger.info('Session refreshed successfully');
      
      return true;
    } catch (error) {
      logger.error('Error refreshing session:', error);
      return false;
    }
  }, 'auth.refreshSession', { type: ErrorTypes.AUTH, returnValue: false }),
  
  /**
   * Set the session and user data
   * @param {Object} session - Session data
   * @param {Object} user - User data
   * @returns {Promise<void>}
   */
  setSession: async (session, user) => {
    // Update auth state
    authState.session = session;
    authState.user = user;
    authState.isAuthenticated = true;
    authState.lastChecked = Date.now();
    authState.isLoading = false;
    
    // Save to storage
    await storage.set(STORAGE_KEYS.SESSION, session);
    await storage.set(STORAGE_KEYS.USER, user);
    
    // Save state
    await authService.saveState();
    
    // Notify other parts of the extension
    try {
      chrome.runtime.sendMessage({
        action: 'authStatusChanged',
        isAuthenticated: true,
        user
      });
    } catch (error) {
      logger.warn('Error notifying about auth status change:', error);
    }
  },
  
  /**
   * Save the current auth state to storage
   * @returns {Promise<void>}
   */
  saveState: async () => {
    const stateToSave = {
      isAuthenticated: authState.isAuthenticated,
      lastChecked: authState.lastChecked
    };
    
    await storage.set(STORAGE_KEYS.STATE, stateToSave);
  },
  
  /**
   * Load auth state from storage
   * @returns {Promise<void>}
   */
  loadState: async () => {
    // Load state
    const state = await storage.get(STORAGE_KEYS.STATE);
    const session = await storage.get(STORAGE_KEYS.SESSION);
    const user = await storage.get(STORAGE_KEYS.USER);
    
    // Update auth state
    authState = {
      isAuthenticated: state?.isAuthenticated || false,
      user: user || null,
      session: session || null,
      lastChecked: state?.lastChecked || null,
      isLoading: false
    };
    
    logger.debug('Loaded auth state from storage', { 
      isAuthenticated: authState.isAuthenticated,
      hasSession: !!authState.session,
      hasUser: !!authState.user
    });
  },
  
  /**
   * Sync auth state with the website
   * @returns {Promise<Object>} Result object
   */
  syncWithWebsite: withErrorHandling(async () => {
    logger.info('Syncing auth state with website');
    
    try {
      // Check if the user is authenticated in the extension
      const isExtensionAuthenticated = await authService.isAuthenticated();
      
      // Check if the user is authenticated on the website
      const response = await fetch('https://main-gallery-ai.lovable.app/api/auth/status', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Website authentication check failed: ${response.status}`);
      }
      
      const data = await response.json();
      const isWebsiteAuthenticated = data.authenticated === true;
      
      logger.info('Auth state comparison', {
        extension: isExtensionAuthenticated,
        website: isWebsiteAuthenticated
      });
      
      // If states don't match, sync them
      if (isExtensionAuthenticated && !isWebsiteAuthenticated) {
        // Extension is authenticated but website is not
        // We should send the token to the website
        logger.info('Syncing auth token to website');
        
        // This would typically involve setting a cookie or making an API call
        // But for now, we'll just open the website with a token parameter
        const session = await authService.getSession();
        
        if (session?.access_token) {
          // Open the website with the token
          chrome.tabs.create({
            url: `https://main-gallery-ai.lovable.app/auth/sync?token=${encodeURIComponent(session.access_token)}`
          });
          
          return { success: true, synced: true, action: 'token_to_website' };
        }
      } else if (!isExtensionAuthenticated && isWebsiteAuthenticated) {
        // Website is authenticated but extension is not
        // We should get the token from the website
        logger.info('Getting auth token from website');
        
        if (data.token) {
          // Process the token
          await authService.processGoogleAuthResult({
            token: data.token,
            user: data.user
          });
          
          return { success: true, synced: true, action: 'token_from_website' };
        } else {
          logger.warn('Website is authenticated but no token was provided');
        }
      } else {
        // States match, no sync needed
        logger.info('Auth states already in sync');
        return { success: true, synced: false, action: 'none' };
      }
      
      return { success: true, synced: false, action: 'none' };
    } catch (error) {
      logger.error('Error syncing auth state:', error);
      throw error;
    }
  }, 'auth.syncWithWebsite', { type: ErrorTypes.AUTH }),
  
  /**
   * Get error handler for authentication errors
   * @returns {Function} Error handler function
   */
  getErrorHandler: () => {
    return (error) => {
      logger.error('Authentication error:', error);
      
      // Show toast notification
      toast.error('Authentication failed: ' + error.message);
      
      // Return error result
      return {
        success: false,
        error: error.message || 'Authentication failed'
      };
    };
  }
};

// Export default for compatibility
export default authService;
