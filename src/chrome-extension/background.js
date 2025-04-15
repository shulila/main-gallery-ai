
/**
 * Background script for MainGallery.AI Chrome Extension
 */

// Import dependencies
import { logger } from './utils/logger.js';
import { storage, STORAGE_KEYS } from './utils/storage.js';
import { authService } from './auth/auth-service.js';
import { setupCallbackUrlListener } from './auth/callback-handler.js';
import { syncAuthState } from './utils/messaging.js';
import { CONFIG } from './utils/config.js';
import { handleError } from './utils/error-handler.js';

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
    }, CONFIG.AUTH_TIMEOUTS.AUTH_SYNC_INTERVAL);
    
    logger.log('Background service worker initialized successfully');
  } catch (error) {
    logger.error('Error initializing background service worker:', error);
  }
}

// Open gallery in new tab or focus existing tab
async function openGalleryTab() {
  return new Promise((resolve, reject) => {
    try {
      const galleryUrl = CONFIG.WEB_APP_URLS.GALLERY;
      
      // Check if a gallery tab is already open
      chrome.tabs.query({ url: `${galleryUrl}*` }, (tabs) => {
        if (tabs.length > 0) {
          // Focus the existing tab
          chrome.tabs.update(tabs[0].id, { active: true });
          chrome.windows.update(tabs[0].windowId, { focused: true });
          resolve(true);
        } else {
          // Open a new tab
          chrome.tabs.create({ url: galleryUrl }, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(true);
            }
          });
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Handle messages asynchronously
async function handleMessage(message, sender) {
  try {
    const action = message.type || message.action;
    logger.log('Received message:', action);
    
    switch (action) {
      case 'SIGN_IN_GOOGLE':
      case 'signInWithGoogle':
        try {
          return await authService.signInWithGoogle();
        } catch (error) {
          return handleError('signInWithGoogle', error);
        }
        
      case 'SIGN_OUT':
      case 'signOut':
        try {
          return await authService.signOut();
        } catch (error) {
          return handleError('signOut', error);
        }
        
      case 'CHECK_AUTH':
      case 'checkAuth':
        try {
          const isAuthenticated = await authService.isAuthenticated();
          const user = isAuthenticated ? await authService.getUser() : null;
          return { success: true, isAuthenticated, user };
        } catch (error) {
          return handleError('checkAuth', error);
        }
        
      case 'SYNC_AUTH':
      case 'syncAuth':
        try {
          const syncResult = await syncAuthState();
          return { success: syncResult };
        } catch (error) {
          return handleError('syncAuth', error);
        }
        
      case 'openGallery':
        try {
          // First check if user is authenticated
          const isAuthenticated = await authService.isAuthenticated();
          
          if (!isAuthenticated) {
            return { 
              success: false, 
              error: 'User is not authenticated',
              requiresAuth: true
            };
          }
          
          await openGalleryTab();
          return { success: true };
        } catch (error) {
          return handleError('openGallery', error);
        }
        
      default:
        logger.warn('Unknown message type:', action);
        return { success: false, error: 'Unknown message type' };
    }
  } catch (error) {
    logger.error('Error handling message:', error);
    return { success: false, error: error.message };
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

// Log that the service worker is ready
logger.log('Background service worker loaded');
