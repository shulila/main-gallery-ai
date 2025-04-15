
/**
 * Callback handler for MainGallery.AI Chrome Extension
 */

import { logger } from '../utils/logger.js';
import { getBaseUrl } from '../utils/urlUtils.js';
import { authService } from './auth-service.js';

/**
 * Set up callback URL listener for authentication
 */
export function setupCallbackUrlListener() {
  try {
    logger.log('Setting up callback URL listener');
    
    // Listen for tab updates
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      try {
        // Check if this is a URL we care about
        if (changeInfo.url && isAuthCallbackUrl(changeInfo.url)) {
          logger.log('Detected auth callback URL');
          
          // Process the callback
          const result = await authService.processGoogleCallback(changeInfo.url);
          
          // Check if authentication was successful
          if (result && result.success) {
            // Close the auth tab
            chrome.tabs.remove(tabId);
            
            // Open or focus the gallery tab
            openGalleryTab();
          } else {
            // Authentication failed, show error in the tab
            const errorMessage = result?.error?.message || 'Authentication failed';
            chrome.tabs.update(tabId, {
              url: `${getBaseUrl()}/auth-error?error=${encodeURIComponent(errorMessage)}`
            });
          }
        }
      } catch (error) {
        logger.error('Error in callback URL listener:', error);
        
        // Show error in the tab
        if (tab && tab.id) {
          chrome.tabs.update(tab.id, {
            url: `${getBaseUrl()}/auth-error?error=${encodeURIComponent(error.message || 'Authentication error')}`
          });
        }
      }
    });
    
    logger.log('Callback URL listener set up successfully');
  } catch (error) {
    logger.error('Error setting up callback URL listener:', error);
  }
}

/**
 * Check if URL is an auth callback URL
 * @param {string} url - URL to check
 * @returns {boolean} Whether URL is an auth callback
 */
function isAuthCallbackUrl(url) {
  try {
    // Check if URL exists
    if (!url) {
      return false;
    }
    
    // Updated to match /auth path (instead of /auth/callback)
    // and look for access_token in URL
    return url.includes('/auth') && 
           (url.includes('access_token=') || url.includes('#access_token='));
  } catch (error) {
    logger.error('Error checking auth callback URL:', error);
    return false;
  }
}

/**
 * Open gallery tab
 */
async function openGalleryTab() {
  try {
    const galleryUrl = `${getBaseUrl()}/gallery`;
    
    // Check if gallery tab is already open
    chrome.tabs.query({ url: `${galleryUrl}*` }, (tabs) => {
      if (tabs && tabs.length > 0) {
        // Focus existing tab
        chrome.tabs.update(tabs[0].id, { active: true });
        chrome.windows.update(tabs[0].windowId, { focused: true });
      } else {
        // Open new tab
        chrome.tabs.create({ url: galleryUrl });
      }
    });
  } catch (error) {
    logger.error('Error opening gallery tab:', error);
  }
}
