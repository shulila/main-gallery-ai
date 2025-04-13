/**
 * Message handlers for background script
 */

import { logger } from '../utils/logger.js';
import { checkAuthStatus, handleAuthToken, signOut } from './auth.js';
import { supabase } from '../utils/supabaseClient.js';
import { resetAuthErrors } from '../utils/auth.js';
import { safeSendMessage, ensureContentScriptLoaded } from '../utils/messaging.js';

/**
 * Sets up message handlers for the extension
 */
export function setupMessageHandlers() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    logger.log(`[MainGallery] Received message: ${message.action || 'Unknown'}`);
    
    // Handle different message types
    switch (message.action) {
      case 'checkAuth':
        handleCheckAuth(sendResponse);
        break;
        
      case 'login':
        handleLogin(message, sendResponse);
        break;
        
      case 'logout':
        handleLogout(sendResponse);
        break;
        
      case 'openAuthPage':
        openAuthPage();
        sendResponse({ success: true });
        break;
        
      case 'handleAuthToken':
        handleProcessAuthToken(message, sendResponse);
        break;
        
      case 'startGoogleAuth':
        handleStartGoogleAuth(sendResponse);
        break;
        
      case 'startAutoScan':
        handleStartScan(message, sender, sendResponse);
        break;
        
      case 'scanComplete':
        handleScanComplete(message, sendResponse);
        break;
        
      case 'openGallery':
        handleOpenGallery(sendResponse);
        break;
        
      case 'addImageToGallery':
        handleAddImage(message, sendResponse);
        break;
        
      case 'resetAuthErrors':
        handleResetAuthErrors(sendResponse);
        break;
        
      default:
        // Unknown message type, still send a response
        sendResponse({ success: false, error: 'Unknown message type' });
        break;
    }
    
    // Return true to indicate that sendResponse will be called asynchronously
    return true;
  });
  
  logger.log('[MainGallery] Message handlers set up');
}

/**
 * Handle check auth request
 */
function handleCheckAuth(sendResponse) {
  checkAuthStatus()
    .then(isAuthenticated => {
      sendResponse({ success: true, isAuthenticated });
    })
    .catch(error => {
      logger.error('[MainGallery] Error checking auth:', error);
      sendResponse({ success: false, error: error.message });
    });
}

/**
 * Handle login request
 */
function handleLogin(message, sendResponse) {
  // This would typically call auth service
  logger.log('[MainGallery] Login requested');
  
  if (message.token) {
    handleAuthToken(message.token, message.provider)
      .then(success => {
        sendResponse({ success });
      })
      .catch(error => {
        logger.error('[MainGallery] Login error:', error);
        sendResponse({ success: false, error: error.message });
      });
  } else {
    openAuthPage();
    sendResponse({ success: true, message: 'Auth page opened' });
  }
}

/**
 * Handle logout request
 */
function handleLogout(sendResponse) {
  signOut()
    .then(success => {
      sendResponse({ success });
    })
    .catch(error => {
      logger.error('[MainGallery] Logout error:', error);
      sendResponse({ success: false, error: error.message });
    });
}

/**
 * Handle processing of auth token
 */
function handleProcessAuthToken(message, sendResponse) {
  if (!message.token) {
    sendResponse({ success: false, error: 'No token provided' });
    return;
  }
  
  handleAuthToken(message.token, message.provider)
    .then(success => {
      sendResponse({ success });
    })
    .catch(error => {
      logger.error('[MainGallery] Error handling auth token:', error);
      sendResponse({ success: false, error: error.message });
    });
}

/**
 * Handle start Google auth request from popup
 */
function handleStartGoogleAuth(sendResponse) {
  logger.log('Starting Google auth flow');
  
  const manifest = chrome.runtime.getManifest();
  const clientId = manifest.oauth2?.client_id;
  
  if (!clientId) {
    const error = 'OAuth client ID not found in manifest';
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
 * Handle scan request
 */
function handleStartScan(message, sender, sendResponse) {
  const tabId = message.tabId || (sender.tab && sender.tab.id);
  
  if (!tabId) {
    sendResponse({ success: false, error: 'No tab ID provided' });
    return;
  }
  
  ensureContentScriptLoaded(tabId)
    .then(loaded => {
      if (!loaded) {
        sendResponse({ success: false, error: 'Failed to load content script' });
        return;
      }
      
      // Forward the scan request to the content script
      return safeSendMessage(tabId, { action: 'startAutoScan' });
    })
    .then(response => {
      sendResponse(response);
    })
    .catch(error => {
      logger.error('[MainGallery] Error starting scan:', error);
      sendResponse({ success: false, error: error.message });
    });
}

/**
 * Handle scan complete notification
 */
function handleScanComplete(message, sendResponse) {
  // Process found images
  const images = message.images || [];
  logger.log(`[MainGallery] Scan complete, found ${images.length} images`);
  
  // Send notification
  if (images.length > 0) {
    chrome.notifications.create('scan-complete', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Scan Complete',
      message: `Found ${images.length} images. They have been added to your gallery.`
    });
    
    // Could sync to server/storage here
  }
  
  sendResponse({ success: true });
}

/**
 * Handle open gallery request
 */
function handleOpenGallery(sendResponse) {
  const galleryUrl = 'https://main-gallery-ai.lovable.app/gallery';
  
  // Check if a gallery tab is already open
  chrome.tabs.query({ url: `${galleryUrl}*` }, (tabs) => {
    if (tabs.length > 0) {
      // Focus the existing tab
      chrome.tabs.update(tabs[0].id, { active: true });
      chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
      // Open a new tab
      chrome.tabs.create({ url: galleryUrl });
    }
    
    if (sendResponse) {
      sendResponse({ success: true });
    }
  });
}

/**
 * Handle adding a single image to gallery
 */
function handleAddImage(message, sendResponse) {
  logger.log(`[MainGallery] Adding image: ${message.imageUrl}`);
  
  // Could save to local storage or sync to server here
  
  // Send notification
  chrome.notifications.create('image-added', {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Image Added',
    message: 'The image has been added to your gallery.'
  });
  
  sendResponse({ success: true });
}

/**
 * Handle resetting auth errors
 */
function handleResetAuthErrors(sendResponse) {
  resetAuthErrors()
    .then(() => {
      sendResponse({ success: true });
    })
    .catch(error => {
      logger.error('Error resetting auth errors:', error);
      sendResponse({ success: false, error: error.message });
    });
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

// Export the necessary functions
export { 
  setupMessageHandlers,
  handleStartGoogleAuth,
  handleResetAuthErrors
};
