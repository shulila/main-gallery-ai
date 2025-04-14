/**
 * Background script for MainGallery.AI Chrome Extension
 */

// Import utilities
import { logger } from './utils/logger.js';
import { setupCallbackUrlListener, isCallbackUrl, processCallbackUrl } from './utils/callback-handler.js';
import { authService } from './utils/auth-service.js';
import { syncAuthState } from './utils/cookie-sync.js';
import { WEB_APP_URLS } from './utils/oauth-config.js';

// Log script initialization
logger.log('Background script initialized');

// Set up callback URL listener for OAuth
setupCallbackUrlListener();

// Periodically sync auth state with web app
setInterval(async () => {
  try {
    await syncAuthState();
  } catch (error) {
    logger.error('Error syncing auth state:', error);
  }
}, 5 * 60 * 1000); // Every 5 minutes

// Set up messaging system
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle messages asynchronously
  handleMessage(message, sender)
    .then(response => {
      if (response) sendResponse(response);
    })
    .catch(error => {
      logger.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    });
  
  // Return true to indicate we will send a response asynchronously
  return true;
});

// Handle messages from popup and content scripts
async function handleMessage(message, sender) {
  try {
    if (!message.action && !message.type) {
      return { success: false, error: 'Invalid message format' };
    }
    
    const action = message.action || message.type;
    logger.log('Received message:', action);
    
    switch (action) {
      case 'checkAuth':
      case 'CHECK_AUTH':
        // Sync auth state before checking
        await syncAuthState();
        const isAuthenticated = await authService.isAuthenticated();
        const user = isAuthenticated ? await authService.getUser() : null;
        return { success: true, isAuthenticated, user };
        
      case 'login':
      case 'SIGN_IN_EMAIL':
        return await authService.signInWithEmailPassword(message.email, message.password);
        
      case 'loginWithGoogle':
      case 'SIGN_IN_GOOGLE':
        const googleResult = await authService.signInWithGoogle();
        if (googleResult.success) {
          // Sync auth state with web app after successful Google sign-in
          await syncAuthState();
        }
        return googleResult;
        
      case 'logout':
      case 'SIGN_OUT':
        const signOutResult = await authService.signOut();
        if (signOutResult.success) {
          // Sync auth state with web app after sign out
          await syncAuthState();
        }
        return signOutResult;
        
      case 'handleAuthToken':
      case 'HANDLE_AUTH_URL':
        let result;
        if (message.url) {
          result = await processCallbackUrl(message.url);
        } else if (message.token) {
          result = await authService.processGoogleCallback(
            `https://example.com/callback#access_token=${message.token}&token_type=bearer&expires_in=3600`
          );
        } else {
          return { success: false, error: 'No URL or token provided' };
        }
        
        // Sync auth state with web app after successful auth
        if (result.success) {
          await syncAuthState();
        }
        
        return result;
        
      case 'openAuthPage':
        chrome.tabs.create({ url: WEB_APP_URLS.AUTH });
        return { success: true };
        
      case 'openGallery':
        // Check if a gallery tab is already open
        chrome.tabs.query({ url: `${WEB_APP_URLS.GALLERY}*` }, (tabs) => {
          if (tabs.length > 0) {
            // Focus the existing tab
            chrome.tabs.update(tabs[0].id, { active: true });
            chrome.windows.update(tabs[0].windowId, { focused: true });
          } else {
            // Open a new tab
            chrome.tabs.create({ url: WEB_APP_URLS.GALLERY });
          }
        });
        return { success: true };
        
      case 'syncAuthState':
        const syncResult = await syncAuthState();
        return { success: syncResult };
        
      case 'PING':
        return { success: true, message: 'PONG' };
        
      default:
        logger.warn('Unknown message type:', action);
        return { success: false, error: 'Unknown message type' };
    }
  } catch (error) {
    logger.error('Error handling message:', error);
    return { success: false, error: error.message };
  }
}

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
            
            // Sync auth state with web app
            syncAuthState().then(() => {
              // Redirect to gallery
              chrome.tabs.update(tabId, { 
                url: WEB_APP_URLS.GALLERY
              });
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

// Initial auth state sync when extension starts
syncAuthState()
  .then(result => {
    logger.log('Initial auth state sync result:', result);
  })
  .catch(error => {
    logger.error('Error in initial auth state sync:', error);
  });

// Keep service worker alive
function keepAlive() {
  logger.log('Keeping service worker alive');
  setTimeout(keepAlive, 20 * 60 * 1000); // 20 minutes
}
keepAlive();

// Tell the world we're ready
logger.log('Background service worker ready');
