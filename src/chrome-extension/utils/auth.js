
/**
 * Authentication utilities for the extension
 * Wrapper around auth-service.js for backwards compatibility
 */

import { logger } from './logger.js';
import { authService } from './auth-service.js';
import { isCallbackUrl, processCallbackUrl } from './callback-handler.js';

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} Whether user is authenticated
 */
export async function isLoggedIn() {
  return await authService.isAuthenticated();
}

/**
 * Get user email
 * @returns {Promise<string|null>} User email or null if not logged in
 */
export async function getUserEmail() {
  const user = await authService.getUser();
  return user?.email || null;
}

/**
 * Open auth page in new tab
 * @param {string} [provider] Provider to use for authentication
 * @returns {Promise<void>}
 */
export async function openAuthPage(provider = null) {
  let authUrl = 'https://main-gallery-ai.lovable.app/auth';
  
  if (provider) {
    authUrl += `?provider=${provider}`;
  }
  
  chrome.tabs.create({ url: authUrl });
}

/**
 * Log out current user
 * @returns {Promise<boolean>} Whether logout was successful
 */
export async function logout() {
  const result = await authService.signOut();
  return result.success;
}

/**
 * Reset any auth errors
 * @returns {Promise<void>}
 */
export async function resetAuthErrors() {
  try {
    // Clear any auth errors or loading states
    await chrome.storage.local.remove(['auth_error', 'auth_loading', 'auth_success']);
    logger.log('Auth errors reset successfully');
  } catch (error) {
    logger.error('Error resetting auth errors:', error);
  }
}

/**
 * Handle OAuth token received from Google
 * @param {string} token - OAuth token
 * @param {string} [provider='google'] - Auth provider
 * @returns {Promise<boolean>} Success status
 */
export async function handleAuthToken(token, provider = 'google') {
  try {
    const result = await authService.processGoogleCallback(
      `https://example.com/callback#access_token=${token}&token_type=bearer&expires_in=3600`
    );
    return result.success;
  } catch (error) {
    logger.error('Error handling auth token:', error);
    return false;
  }
}

/**
 * Handle authentication URL
 * @param {string} url - Auth callback URL
 * @returns {Promise<{success: boolean, error?: string}>} Result
 */
export async function handleAuthUrl(url) {
  if (!url) {
    return { success: false, error: 'No URL provided' };
  }
  
  if (!isCallbackUrl(url)) {
    return { success: false, error: 'Not a valid callback URL' };
  }
  
  return await processCallbackUrl(url);
}

// Export additional functions for backwards compatibility
export {
  isCallbackUrl,
  processCallbackUrl
};
