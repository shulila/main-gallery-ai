
/**
 * Background script for MainGallery.AI Chrome Extension
 */

import { logger } from './utils/logger.js';
import { storage, STORAGE_KEYS } from './utils/storage.js';
import { authService } from './utils/auth-service.js';
import { setupCallbackUrlListener } from './utils/callback-handler.js';
import { syncAuthState } from './utils/cookie-sync.js';
import { AUTH_TIMEOUTS } from './utils/oauth-config.js';

// Initial setup
async function initialize() {
  try {
    logger.log('Initializing background service worker');
    
    // Set up callback URL listener for Google auth
    setupCallbackUrlListener();
    
    // Perform initial auth state sync
    await syncAuthState();
    
    // Set up periodic auth state sync
    setInterval(async () => {
      try {
        await syncAuthState();
      } catch (error) {
        logger.error('Error in periodic auth sync:', error);
      }
    }, AUTH_TIMEOUTS.AUTH_SYNC_INTERVAL);
    
    logger.log('Background service worker initialized successfully');
  } catch (error) {
    logger.error('Error initializing background service worker:', error);
  }
}

// Initialize the extension
initialize();

// Handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(response => sendResponse(response))
    .catch(error => {
      logger.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    });
  return true; // Indicates we'll respond asynchronously
});

// Handle messages asynchronously
async function handleMessage(message, sender) {
  try {
    switch (message.type) {
      case 'SIGN_IN_GOOGLE':
        return await authService.signInWithGoogle();
        
      case 'SIGN_OUT':
        return await authService.signOut();
        
      case 'CHECK_AUTH':
        const isAuthenticated = await authService.isAuthenticated();
        const user = isAuthenticated ? await authService.getUser() : null;
        return { success: true, isAuthenticated, user };
        
      case 'SYNC_AUTH':
        return { success: await syncAuthState() };
        
      default:
        logger.warn('Unknown message type:', message.type);
        return { success: false, error: 'Unknown message type' };
    }
  } catch (error) {
    logger.error('Error handling message:', error);
    throw error;
  }
}

// Log that the service worker is ready
logger.log('Background service worker initialized');
