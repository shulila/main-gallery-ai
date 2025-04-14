
/**
 * Callback handler for MainGallery.AI Chrome Extension
 * מודול לטיפול ב-URL callbacks מגוגל
 */

import { logger } from './logger.js';
import { authService } from './auth-service.js';

/**
 * Set up callback URL listener
 * מאזין לשינויים בטאבים ומזהה URLs של callbacks
 */
export function setupCallbackUrlListener() {
  try {
    logger.log('Setting up callback URL listener');
    
    // Listen for tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      // Only process if URL changed and is complete
      if (changeInfo.status === 'complete' && tab.url) {
        if (authService.isCallbackUrl(tab.url)) {
          logger.log('Detected callback URL in tab:', tabId);
          
          // Process the callback URL
          authService.processGoogleCallback(tab.url)
            .then(result => {
              if (result.success) {
                logger.log('Successfully processed callback URL');
                
                // Redirect to gallery
                chrome.tabs.update(tabId, { 
                  url: 'https://main-gallery-ai.lovable.app/gallery' 
                });
              } else {
                logger.error('Failed to process callback URL:', result.error);
                
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
                  args: [result.error]
                }).catch(err => {
                  logger.error('Error executing script in tab:', err);
                });
              }
            })
            .catch(error => {
              logger.error('Error in callback processing:', error);
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
 * Check if the current URL is a callback URL with access_token
 * @param {string} url - URL to check
 * @returns {boolean} - Whether the URL is a callback URL
 */
export function isCallbackUrl(url) {
  return authService.isCallbackUrl(url);
}

/**
 * Process the callback URL and handle the authentication
 * @param {string} url - Callback URL
 * @returns {Promise<{success: boolean, error?: string}>} - Result of processing
 */
export async function processCallbackUrl(url) {
  return await authService.processGoogleCallback(url);
}
