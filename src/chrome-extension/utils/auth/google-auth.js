
/**
 * Google authentication for MainGallery.AI Chrome Extension
 */

import { logger } from '../logger.js';
import { storage, STORAGE_KEYS } from '../storage.js';
import { syncAuthState } from '../cookie-sync.js';
import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES, WEB_APP_URLS, AUTH_TIMEOUTS } from '../oauth-config.js';
import { validateGoogleToken } from './token-validator.js';

/**
 * @typedef {Object} UserInfo
 * @property {string} sub - User ID
 * @property {string} email - User email
 * @property {string} name - User name
 * @property {string} picture - User profile picture URL
 * @property {boolean} [email_verified] - Whether the email is verified
 */

/**
 * @typedef {Object} AuthUser
 * @property {string} id - User ID
 * @property {string} email - User email
 * @property {string} name - User name
 * @property {string} picture - User profile picture URL
 * @property {string} provider - Auth provider (e.g., 'google')
 * @property {Object} user_metadata - Additional user metadata
 * @property {Object} app_metadata - Application metadata
 */

/**
 * @typedef {Object} AuthSession
 * @property {string} provider - Auth provider (e.g., 'google')
 * @property {string} provider_token - Provider-specific token
 * @property {string} access_token - Access token
 * @property {number|string} expires_at - Expiration timestamp
 * @property {AuthUser} [user] - User information
 */

/**
 * @typedef {Object} AuthResult
 * @property {boolean} success - Whether the operation was successful
 * @property {string} [error] - Error message if operation failed
 * @property {AuthUser} [user] - User information if operation succeeded
 */

/**
 * Get user info from Google API with better error handling
 * @param {string} accessToken - Google access token
 * @returns {Promise<UserInfo>} User information
 */
async function getUserInfo(accessToken) {
  try {
    if (!accessToken) {
      logger.error('Attempted to get user info with no access token');
      return createDefaultUserInfo();
    }

    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      logger.error(`Failed to get user info: ${response.status}`);
      return createDefaultUserInfo();
    }

    const data = await response.json();
    
    // Validate the user info and provide defaults
    return {
      sub: data.sub || 'unknown',
      email: data.email || '',
      name: data.name || data.given_name || 'Unknown User',
      picture: data.picture || '',
      email_verified: !!data.email_verified
    };
  } catch (error) {
    logger.error('Error getting user info:', error);
    return createDefaultUserInfo();
  }
}

/**
 * Create default user info for fallback
 * @returns {UserInfo} Default user info
 */
function createDefaultUserInfo() {
  return {
    sub: 'unknown',
    email: '',
    name: 'Unknown User',
    picture: '',
    email_verified: false
  };
}

/**
 * Sign in with Google using chrome.identity API
 * @returns {Promise<AuthResult>} Authentication result
 */
export async function signInWithGoogle() {
  try {
    logger.log('Initiating Google sign in with chrome.identity');

    return new Promise((resolve) => {
      chrome.identity.getAuthToken({ 
        interactive: true,
        scopes: GOOGLE_SCOPES
      }, async (token) => {
        if (chrome.runtime.lastError) {
          const error = chrome.runtime.lastError;
          logger.error('Error getting auth token:', error);
          
          // Categorize errors for better handling
          let errorMessage = error.message || 'No authentication token received';
          if (error.message?.includes('canceled')) {
            errorMessage = 'Authentication was canceled by the user';
          } else if (error.message?.includes('network')) {
            errorMessage = 'Network error during authentication. Please check your connection';
          }
          
          return resolve({
            success: false,
            error: errorMessage
          });
        }

        if (!token) {
          return resolve({
            success: false,
            error: 'No authentication token received'
          });
        }

        try {
          // Validate the token first
          const tokenValidation = await validateGoogleToken(token);
          if (!tokenValidation.valid) {
            logger.error('Invalid Google token:', tokenValidation.reason);
            return resolve({
              success: false,
              error: `Authentication failed: ${tokenValidation.reason}`
            });
          }
          
          const userInfo = await getUserInfo(token);
          
          const user = {
            id: userInfo.sub || 'unknown',
            email: userInfo.email || '',
            name: userInfo.name || 'Unknown User',
            picture: userInfo.picture || '',
            provider: 'google',
            user_metadata: {
              full_name: userInfo.name || 'Unknown User',
              avatar_url: userInfo.picture || ''
            },
            app_metadata: {
              provider: 'google'
            }
          };

          const session = {
            provider: 'google',
            provider_token: token,
            access_token: token,
            expires_at: Date.now() + 3600 * 1000,
            created_at: Date.now(),
            user
          };

          await storage.set(STORAGE_KEYS.SESSION, session);
          await storage.set(STORAGE_KEYS.USER, user);
          await syncAuthState();

          return resolve({
            success: true,
            user
          });
        } catch (error) {
          logger.error('Error processing Google auth token:', error);
          return resolve({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error during authentication'
          });
        }
      });
    });
  } catch (error) {
    logger.error('Error in signInWithGoogle:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during authentication'
    };
  }
}

/**
 * Process Google callback URL with improved error handling
 * @param {string} url - Callback URL
 * @returns {Promise<AuthResult>} Authentication result
 */
export async function processGoogleCallback(url) {
  try {
    if (!url) {
      return { success: false, error: 'No callback URL provided' };
    }

    // Extract parameters from URL with better parsing
    let accessToken = '';
    let expiresIn = 3600; // Default 1 hour
    
    try {
      // Try to extract from hash fragment first
      if (url.includes('#')) {
        const hashParams = new URLSearchParams(url.split('#')[1] || '');
        accessToken = hashParams.get('access_token') || '';
        const expParam = hashParams.get('expires_in');
        if (expParam) expiresIn = parseInt(expParam, 10);
      }
      
      // If not found, try query parameters
      if (!accessToken && url.includes('?')) {
        const queryParams = new URLSearchParams(url.split('?')[1] || '');
        accessToken = queryParams.get('access_token') || '';
        const expParam = queryParams.get('expires_in');
        if (expParam) expiresIn = parseInt(expParam, 10);
      }
    } catch (error) {
      logger.error('Error parsing URL parameters:', error);
    }
    
    if (!accessToken) {
      return { success: false, error: 'No access token found in callback URL' };
    }
    
    // Validate the token first
    const tokenValidation = await validateGoogleToken(accessToken);
    if (!tokenValidation.valid) {
      logger.error('Invalid Google token:', tokenValidation.reason);
      return {
        success: false,
        error: `Authentication failed: ${tokenValidation.reason}`
      };
    }

    // Get user info with better error handling
    const userInfo = await getUserInfo(accessToken);
    
    if (!userInfo || !userInfo.sub) {
      return { success: false, error: 'Failed to get valid user information' };
    }

    const user = {
      id: userInfo.sub,
      email: userInfo.email || '',
      name: userInfo.name || 'Unknown User',
      picture: userInfo.picture || '',
      provider: 'google',
      user_metadata: {
        full_name: userInfo.name || 'Unknown User',
        avatar_url: userInfo.picture || ''
      },
      app_metadata: {
        provider: 'google'
      }
    };

    const session = {
      provider: 'google',
      provider_token: accessToken,
      access_token: accessToken,
      expires_at: Date.now() + (expiresIn * 1000),
      created_at: Date.now(),
      user
    };

    await storage.set(STORAGE_KEYS.SESSION, session);
    await storage.set(STORAGE_KEYS.USER, user);
    await syncAuthState();

    return { success: true, user };
  } catch (error) {
    logger.error('Error processing Google callback:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error during authentication'
    };
  }
}
