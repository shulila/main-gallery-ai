
import { createNotification } from './utils/notifications.js';
import { 
  handlePlatformConnection, 
  handlePlatformConnected, 
  handlePlatformDisconnected, 
  handleAddToGallery,
  openGallery
} from './utils/platforms.js';
import { setupAuthCallbackListener, openAuthPage } from './utils/auth.js';

// Set up auth callback listener
setupAuthCallbackListener();

// Listen for extension installation/update
chrome.runtime.onInstalled.addListener(function(details) {
  // Show a notification to pin the extension on install
  if (details.reason === 'install') {
    try {
      console.log('Extension installed, creating welcome notification');
      
      // Create a unique ID for this notification
      const notificationId = 'installation-' + Date.now();
      
      // Use our notification function
      createNotification(
        notificationId, 
        'Pin MainGallery Extension',
        'Click the puzzle icon in your toolbar and pin MainGallery for easy access!'
      );
    } catch (error) {
      console.error('Failed to show installation notification:', error);
    }
  }
  
  console.log('Extension installed:', details.reason);
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log('Received message:', message.action);
  
  switch (message.action) {
    case 'initiatePlatformConnection':
      handlePlatformConnection(message.platform);
      break;
      
    case 'platformConnected':
      handlePlatformConnected(message.platform);
      break;
      
    case 'platformDisconnected':
      handlePlatformDisconnected(message.platform);
      break;
      
    case 'addToGallery':
      handleAddToGallery(message.data)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Will respond asynchronously
      
    case 'openGallery':
      openGallery();
      break;
      
    case 'openAuthPage':
      openAuthPage(message.redirectUrl);
      break;
      
    case 'isInstalled':
      // Simple ping to check if extension is installed
      sendResponse({ installed: true });
      break;
  }
  
  // Return true to indicate we'll respond asynchronously
  return true;
});
