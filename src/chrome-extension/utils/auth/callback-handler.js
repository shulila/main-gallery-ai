
/**
 * Callback URL handler for Google authentication
 */

import { logger } from '../logger.js';
import { authService } from './auth-service.js';
import { syncAuthState } from '../cookie-sync.js';
import { WEB_APP_URLS } from '../oauth-config.js';

/**
 * Set up callback URL listener with improved error handling
 */
export function setupCallbackUrlListener() {
  try {
    logger.log('Setting up callback URL listener');
    
    // Listen for tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      // Only process if URL changed and is complete
      if (changeInfo.status === 'complete' && tab && tab.url) {
        try {
          if (isAuthCallbackUrl(tab.url)) {
            logger.log('Detected callback URL in tab:', tabId);
            
            // Process the callback URL
            processCallbackUrl(tab.url, tabId)
              .then(result => {
                if (result && result.success) {
                  logger.log('Successfully processed callback URL');
                  
                  // Sync auth state with web app
                  syncAuthState().then(() => {
                    // Redirect to gallery
                    chrome.tabs.update(tabId, { 
                      url: WEB_APP_URLS.GALLERY || 'https://main-gallery-ai.lovable.app/gallery'
                    });
                  }).catch(err => {
                    logger.error('Error syncing auth state after callback:', err);
                  });
                } else {
                  const errorMsg = result && result.error ? result.error : 'Failed to authenticate with Google';
                  logger.error('Failed to process callback URL:', errorMsg);
                  
                  // Show error in the tab
                  chrome.scripting.executeScript({
                    target: { tabId },
                    func: (errorMessage) => {
                      document.body.innerHTML = `
                        <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
                          <h2>Authentication Error</h2>
                          <p>${errorMessage || 'Failed to authenticate with Google'}</p>
                          <button onclick="window.close()" style="padding: 10px 20px; margin-top: 20px; cursor: pointer;">Close</button>
                        </div>
                      `;
                    },
                    args: [errorMsg]
                  }).catch(err => {
                    logger.error('Error executing script in tab:', err);
                  });
                }
              })
              .catch(error => {
                logger.error('Error in callback processing:', error);
              });
          }
        } catch (error) {
          logger.error('Error processing tab update:', error);
        }
      }
    });
    
    logger.log('Callback URL listener set up successfully');
  } catch (error) {
    logger.error('Error setting up callback URL listener:', error);
  }
}

/**
 * Check if the current URL is a callback URL with improved validation
 * @param {string} url - URL to check
 * @returns {boolean} - Whether the URL is a callback URL
 */
export function isAuthCallbackUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  try {
    // Check if the URL is from our web app callback
    if (WEB_APP_URLS.AUTH_CALLBACK && url.includes(WEB_APP_URLS.AUTH_CALLBACK)) {
      return true;
    }
    
    // Also check for any URL with access_token or code parameter
    return (url.includes('/auth') && 
           (url.includes('access_token=') || url.includes('code=')));
  } catch (error) {
    logger.error('Error checking if URL is callback:', error);
    return false;
  }
}

/**
 * Process the callback URL and handle the authentication with improved error handling
 * @param {string} url - Callback URL
 * @param {number} tabId - Tab ID for UI feedback
 * @returns {Promise<{success: boolean, error?: string}>} - Result of processing
 */
export async function processCallbackUrl(url, tabId) {
  try {
    logger.log('Processing callback URL');
    
    if (!url) {
      return {
        success: false,
        error: 'Invalid callback URL: URL is empty'
      };
    }
    
    const result = await authService.processGoogleCallback(url);
    
    if (result && result.success) {
      // Sync auth state with web app after successful processing
      try {
        await syncAuthState();
      } catch (syncError) {
        logger.error('Error syncing auth state:', syncError);
        // Continue even if sync fails
      }
    } else {
      logger.error('Auth service failed to process callback:', result?.error || 'Unknown error');
    }
    
    return result || { success: false, error: 'No result from auth processing' };
  } catch (error) {
    logger.error('Error processing callback URL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error processing callback URL'
    };
  }
}
