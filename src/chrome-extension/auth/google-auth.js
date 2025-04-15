
/**
 * Google authentication for MainGallery.AI Chrome Extension
 */

import { logger } from '../utils/logger.js';
import { storage, STORAGE_KEYS } from '../utils/storage.js';
import { getBaseUrl } from '../utils/urlUtils.js';
import { createError } from '../utils/error-handler.js';

/**
 * Sign in with Google
 * @returns {Promise<Object>} Authentication result
 */
export async function signInWithGoogle() {
  try {
    logger.log('Starting Google sign-in flow');
    
    // Generate a random state value for security
    const state = Math.random().toString(36).substring(2, 15);
    await storage.set(STORAGE_KEYS.AUTH_STATE, state);
    
    // Set auth in progress flag
    await storage.set(STORAGE_KEYS.AUTH_IN_PROGRESS, true);
    
    // Create Google OAuth URL
    const authUrl = createGoogleAuthUrl(state);
    
    // Open Google auth in a new tab
    chrome.tabs.create({ url: authUrl });
    
    // Set a timeout to clear the auth in progress flag
    setTimeout(async () => {
      const inProgress = await storage.get(STORAGE_KEYS.AUTH_IN_PROGRESS);
      if (inProgress) {
        await storage.remove(STORAGE_KEYS.AUTH_IN_PROGRESS);
        logger.warn('Auth flow timed out');
      }
    }, 5 * 60 * 1000); // 5 minutes timeout
    
    return { success: true, message: 'Auth flow started' };
  } catch (error) {
    logger.error('Error starting Google sign-in flow:', error);
    await storage.remove(STORAGE_KEYS.AUTH_IN_PROGRESS);
    throw createError('Failed to start Google sign-in', 'GOOGLE_SIGNIN_ERROR');
  }
}

/**
 * Create Google OAuth URL
 * @param {string} state - Random state for security
 * @returns {string} Google OAuth URL
 */
function createGoogleAuthUrl(state) {
  // Changed from /auth to /auth/callback for redirect
  const redirectUri = encodeURIComponent(`${getBaseUrl()}/auth/callback`);
  const scope = encodeURIComponent('profile email');
  const responseType = 'token';
  const clientId = chrome.runtime.getManifest().oauth2.client_id;
  
  return `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&scope=${scope}&state=${state}`;
}

/**
 * Process Google callback
 * @param {string} url - Callback URL with auth token
 * @returns {Promise<Object>} Authentication result
 */
export async function processGoogleCallback(url) {
  try {
    logger.log('Processing Google callback');
    
    // Check if auth is in progress
    const inProgress = await storage.get(STORAGE_KEYS.AUTH_IN_PROGRESS);
    if (!inProgress) {
      logger.warn('No auth flow in progress');
      throw createError('No authentication flow in progress', 'NO_AUTH_FLOW');
    }
    
    // Clear auth in progress flag
    await storage.remove(STORAGE_KEYS.AUTH_IN_PROGRESS);
    
    // Parse URL for token and state
    const params = parseCallbackUrl(url);
    
    // Validate state parameter
    const storedState = await storage.get(STORAGE_KEYS.AUTH_STATE);
    if (!params.state || params.state !== storedState) {
      logger.error('State mismatch, possible CSRF attack');
      throw createError('Invalid state parameter', 'INVALID_STATE');
    }
    
    // Clear stored state
    await storage.remove(STORAGE_KEYS.AUTH_STATE);
    
    // Check for access token
    if (!params.access_token) {
      logger.error('No access token in callback URL');
      throw createError('No access token received', 'NO_ACCESS_TOKEN');
    }
    
    // Get user info with the token
    const userInfo = await fetchGoogleUserInfo(params.access_token);
    
    // Create session object
    const session = {
      provider: 'google',
      provider_token: params.access_token,
      access_token: params.access_token,
      expires_at: Date.now() + (params.expires_in ? parseInt(params.expires_in) * 1000 : 3600000),
      created_at: Date.now(),
      updated_at: Date.now(),
      user: userInfo
    };
    
    // Store session and user info
    await storage.set(STORAGE_KEYS.SESSION, session);
    await storage.set(STORAGE_KEYS.USER, userInfo);
    
    logger.log('Google authentication successful');
    
    return { success: true, user: userInfo };
  } catch (error) {
    logger.error('Error processing Google callback:', error);
    throw error;
  }
}

/**
 * Parse callback URL for auth parameters
 * @param {string} url - Callback URL
 * @returns {Object} Parsed parameters
 */
function parseCallbackUrl(url) {
  try {
    // Ensure URL is provided
    if (!url) {
      return {};
    }
    
    const hashParams = url.split('#')[1];
    if (!hashParams) {
      return {};
    }
    
    const params = {};
    hashParams.split('&').forEach(param => {
      const [key, value] = param.split('=');
      if (key && value) {
        params[key] = decodeURIComponent(value);
      }
    });
    
    return params;
  } catch (error) {
    logger.error('Error parsing callback URL:', error);
    return {};
  }
}

/**
 * Fetch Google user info with access token
 * @param {string} accessToken - Google access token
 * @returns {Promise<Object>} User info
 */
async function fetchGoogleUserInfo(accessToken) {
  try {
    // Validate access token
    if (!accessToken) {
      throw createError('Access token is required', 'INVALID_TOKEN');
    }
    
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (!response.ok) {
      throw createError(`Google API error: ${response.status} ${response.statusText}`, 'GOOGLE_API_ERROR');
    }
    
    const data = await response.json();
    
    // Validate required fields
    if (!data || !data.sub) {
      throw createError('Invalid user data received from Google', 'INVALID_USER_DATA');
    }
    
    // Ensure all required fields exist with fallbacks
    return {
      id: data.sub || '',
      email: data.email || '',
      name: data.name || data.given_name || '',
      picture: data.picture || '',
      provider: 'google',
      user_metadata: {
        full_name: data.name || '',
        avatar_url: data.picture || ''
      },
      app_metadata: {
        provider: 'google'
      }
    };
  } catch (error) {
    logger.error('Error fetching Google user info:', error);
    
    // Return a minimal valid user object to prevent undefined errors
    return {
      id: 'unknown',
      email: '',
      name: 'Unknown User',
      picture: '',
      provider: 'google',
      user_metadata: {
        full_name: 'Unknown User',
        avatar_url: ''
      },
      app_metadata: {
        provider: 'google'
      }
    };
  }
}
