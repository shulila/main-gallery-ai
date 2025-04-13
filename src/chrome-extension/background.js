/**
 * Background script for MainGallery.AI Chrome Extension
 */

// Import utilities
import { logger } from './utils/logger.js';
import { setupAuthListeners } from './background/auth.js';
import { setupMessageHandlers } from './background/messaging.js';
import { setupCallbackUrlListener, processCallbackUrl, isCallbackUrl } from './utils/callback-handler.js';

// Log script initialization
logger.log('Background script initialized');

// Initialize authentication
setupAuthListeners();

// Set up message handlers
setupMessageHandlers();

// Set up callback URL listener for OAuth
setupCallbackUrlListener();

// Listen for tab updates to capture OAuth callbacks
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only process if URL changed and is complete
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if this is a callback URL
    if (isCallbackUrl(tab.url)) {
      logger.log('Detected callback URL in tab update:', tabId);
      
      // Process the callback URL
      processCallbackUrl(tab.url)
        .then(result => {
          if (result.success) {
            logger.log('Successfully processed callback URL from tab update');
            
            // Redirect to gallery
            chrome.tabs.update(tabId, { 
              url: 'https://main-gallery-ai.lovable.app/gallery'
            });
          } else {
            logger.error('Failed to process callback URL from tab update:', result.error);
          }
        })
        .catch(error => {
          logger.error('Error processing callback URL from tab update:', error);
        });
    }
  }
});

// Keep service worker alive
function keepAlive() {
  logger.log('Keeping service worker alive');
  setTimeout(keepAlive, 20 * 60 * 1000); // 20 minutes
}
keepAlive();

// Tell the world we're ready
logger.log('Background service worker ready');
