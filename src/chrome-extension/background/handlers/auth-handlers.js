
/**
 * Authentication message handlers for background script
 */

import { logger } from '../../utils/logger.js';
import { checkAuthStatus, handleAuthToken, signOut, resetAuthErrors } from '../auth.js';
import { storage, STORAGE_KEYS } from '../../utils/storage.js';
import { validateClientId } from '../../utils/auth/client-validator.js';

/**
 * Handle check auth request
 * @param {Function} sendResponse - Response callback
 */
export async function handleCheckAuth(sendResponse) {
  try {
    const isAuthenticated = await checkAuthStatus();
    sendResponse({ success: true, isAuthenticated });
  } catch (error) {
    logger.error('[MainGallery] Error checking auth:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle login request
 * @param {Object} message - Message object
 * @param {Function} sendResponse - Response callback
 */
export async function handleLogin(message, sendResponse) {
  logger.log('[MainGallery] Login requested');
  
  if (message.token) {
    try {
      const success = await handleAuthToken(message.token, message.provider);
      sendResponse({ success });
    } catch (error) {
      logger.error('[MainGallery] Login error:', error);
      sendResponse({ success: false, error: error.message });
    }
  } else {
    openAuthPage();
    sendResponse({ success: true, message: 'Auth page opened' });
  }
}

/**
 * Handle logout request
 * @param {Function} sendResponse - Response callback
 */
export async function handleLogout(sendResponse) {
  try {
    const success = await signOut();
    sendResponse({ success });
  } catch (error) {
    logger.error('[MainGallery] Logout error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle processing of auth token
 * @param {Object} message - Message object
 * @param {Function} sendResponse - Response callback
 */
export async function handleProcessAuthToken(message, sendResponse) {
  if (!message.token) {
    sendResponse({ success: false, error: 'No token provided' });
    return;
  }
  
  try {
    const success = await handleAuthToken(message.token, message.provider);
    sendResponse({ success });
  } catch (error) {
    logger.error('[MainGallery] Error handling auth token:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle start Google auth request from popup
 * @param {Function} sendResponse - Response callback
 */
export async function handleStartGoogleAuth(sendResponse) {
  logger.log('Starting Google auth flow');
  
  const manifest = chrome.runtime.getManifest();
  const clientId = manifest.oauth2?.client_id;
  
  // Validate client ID to prevent "bad client id" errors
  if (!validateClientId(clientId)) {
    const error = 'Invalid Google OAuth client ID format';
    logger.error(error);
    sendResponse({ success: false, error });
    return;
  }
  
  // Use chrome.identity.getAuthToken for a more reliable auth flow
  chrome.identity.getAuthToken({ interactive: true }, (token) => {
    if (chrome.runtime.lastError) {
      logger.error('Error getting auth token:', chrome.runtime.lastError);
      sendResponse({ 
        success: false, 
        error: chrome.runtime.lastError.message 
      });
      return;
    }
    
    if (token) {
      logger.log('Got auth token from Google');
      
      // Process the token
      handleAuthToken(token, 'google')
        .then(success => {
          sendResponse({ success });
          
          // Also notify any open popups
          chrome.runtime.sendMessage({ 
            action: 'authStatusChanged', 
            isAuthenticated: true
          }).catch(() => {
            // Ignore errors if no popup is listening
          });
        })
        .catch(error => {
          logger.error('Error handling Google auth token:', error);
          sendResponse({ success: false, error: error.message });
        });
    } else {
      logger.error('No auth token returned');
      sendResponse({ success: false, error: 'No auth token returned' });
    }
  });
}

/**
 * Handle resetting auth errors
 * @param {Function} sendResponse - Response callback
 */
export async function handleResetAuthErrors(sendResponse) {
  try {
    await resetAuthErrors();
    sendResponse({ success: true });
  } catch (error) {
    logger.error('Error resetting auth errors:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Opens the auth page in a new tab
 */
export function openAuthPage() {
  const authUrl = 'https://main-gallery-ai.lovable.app/auth';
  
  chrome.tabs.create({ url: authUrl }, (tab) => {
    logger.log("[MainGallery] Opened auth page in new tab", tab.id);
  });
}
