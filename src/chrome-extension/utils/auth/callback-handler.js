
/**
 * Callback handler for MainGallery.AI Chrome Extension
 */

import { logger } from '../logger.js';
import { authService } from './auth-service.js';

// Let's add a state to track if we're currently processing a callback
let isProcessingCallback = false;

/**
 * Set up callback URL listener
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
            processCallbackUrl(tab.url)
              .then(result => {
                if (result.success) {
                  logger.log('Successfully processed callback URL');
                } else {
                  logger.error('Failed to process callback URL:', result.error);
                }
              })
              .catch(error => {
                logger.error('Error processing callback URL:', error);
              });
          }
        } catch (error) {
          logger.error('Error handling tab update:', error);
        }
      }
    });
    
    logger.log('Callback URL listener set up successfully');
  } catch (error) {
    logger.error('Error setting up callback URL listener:', error);
  }
}

/**
 * Process callback URL
 * @param {string} url - Auth callback URL
 * @returns {Promise<Object>} Auth result
 */
export async function processCallbackUrl(url) {
  try {
    // Prevent duplicate processing
    if (isProcessingCallback) {
      logger.log('Already processing a callback, skipping');
      return { success: false, error: 'Already processing a callback' };
    }
    
    isProcessingCallback = true;
    
    try {
      logger.log('Processing callback URL');
      
      // Use authService to process callback
      const result = await authService.processGoogleCallback(url);
      
      logger.log('Callback URL processed successfully');
      
      return result;
    } finally {
      // Reset processing state after a delay to prevent immediate reprocessing
      setTimeout(() => {
        isProcessingCallback = false;
      }, 1000);
    }
  } catch (error) {
    logger.error('Error processing callback URL:', error);
    isProcessingCallback = false;
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Check if URL is a callback URL
 * @param {string} url - URL to check
 * @returns {boolean} - Whether the URL is a callback URL
 */
export function isAuthCallbackUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  try {
    // Check if URL contains the callback path
    if (url.includes('/auth/callback')) {
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
