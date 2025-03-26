
import { createNotification } from './utils/notifications.js';
import { 
  handlePlatformConnection, 
  handlePlatformConnected, 
  handlePlatformDisconnected, 
  handleAddToGallery,
  openGallery
} from './utils/platforms.js';
import { setupAuthCallbackListener, openAuthPage } from './utils/auth.js';
import { debugPlatformDetection, getGalleryUrl } from './utils/common.js';

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

// Listen for tab updates to detect supported platforms
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const platformId = debugPlatformDetection(tab.url);
    
    if (platformId) {
      console.log(`MainGallery: Detected ${platformId} on tab ${tabId}`);
      
      // Notify the content script that we've detected a supported platform
      chrome.tabs.sendMessage(tabId, { 
        action: 'platformDetected',
        platformId: platformId
      }).catch(err => {
        console.log('Content script may not be ready yet:', err.message);
      });
    }
  }
});

// Listen for auth state changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.main_gallery_auth_token) {
    // Auth token changed, notify content scripts
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { 
          action: 'authStateChanged',
          isLoggedIn: !!changes.main_gallery_auth_token.newValue
        }).catch(() => {
          // Ignore errors for tabs where content script isn't running
        });
      });
    });
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log('Received message:', message.action, 'from:', sender);
  
  switch (message.action) {
    case 'contentScriptLoaded':
      // Content script has loaded, check if we're on a supported platform
      if (sender.tab && sender.tab.url) {
        const platformId = debugPlatformDetection(sender.tab.url);
        if (platformId) {
          // Send response immediately to confirm detection
          sendResponse({ 
            success: true, 
            platformId: platformId,
            message: `Detected ${platformId} platform` 
          });
        } else {
          sendResponse({ success: false, message: 'Not a supported platform' });
        }
      }
      break;
      
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
      chrome.tabs.create({ url: getGalleryUrl() });
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
