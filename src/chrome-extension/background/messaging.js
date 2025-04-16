
/**
 * Message handlers for background script
 */

import { logger } from '../utils/logger.js';
import { 
  handleCheckAuth, 
  handleLogin, 
  handleLogout, 
  openAuthPage,
  handleProcessAuthToken, 
  handleStartGoogleAuth,
  handleResetAuthErrors
} from './handlers/auth-handlers.js';

import {
  handleStartScan,
  handleScanComplete,
  handleAddImage
} from './handlers/scan-handlers.js';

import {
  handleOpenGallery
} from './handlers/navigation-handlers.js';

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

// Export functions for use in other modules
export { 
  setupMessageHandlers,
  openAuthPage,
  handleStartGoogleAuth,
  handleResetAuthErrors
};
