
import { createNotification } from './utils/notifications.js';
import { 
  handlePlatformConnection, 
  handlePlatformConnected, 
  handlePlatformDisconnected, 
  handleAddToGallery,
  openGallery,
  detectPlatformLogin,
  isPlatformConnected
} from './utils/platforms.js';
import { setupAuthCallbackListener, openAuthPage, isLoggedIn } from './utils/auth.js';
import { debugPlatformDetection, getGalleryUrl } from './utils/common.js';

// Set up auth callback listener
setupAuthCallbackListener();

// Listen for extension installation/update
chrome.runtime.onInstalled.addListener(function(details) {
  console.log('Extension installed or updated:', details.reason);
  
  // Show a notification to pin the extension on install
  if (details.reason === 'install') {
    try {
      console.log('Extension installed, creating welcome notification');
      
      // Create a unique ID for this notification
      const notificationId = 'installation-' + Date.now();
      
      // Use our notification function
      createNotification(
        notificationId, 
        'Welcome to MainGallery',
        'Pin this extension for quick access to your AI art gallery!'
      );
    } catch (error) {
      console.error('Failed to show installation notification:', error);
    }
  }
});

// Listen for tab updates to detect supported platforms
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const platformId = debugPlatformDetection(tab.url);
    
    if (platformId) {
      console.log(`MainGallery: Detected ${platformId} on tab ${tabId}`);
      
      // Check if user is logged in to MainGallery
      isLoggedIn().then(loggedIn => {
        // Notify the content script that we've detected a supported platform
        chrome.tabs.sendMessage(tabId, { 
          action: 'platformDetected',
          platformId: platformId,
          userLoggedIn: loggedIn
        }).catch(err => {
          console.log('Content script may not be ready yet:', err.message);
        });
        
        // If the user is logged in, also check platform login status
        if (loggedIn) {
          detectPlatformLogin(platformId, tabId);
        }
      });
    }
  }
});

// Listen for clicks on the extension icon in the toolbar - IMPROVED LOGIC
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension icon clicked in toolbar');
  
  // Check if user is logged in to MainGallery
  const loggedIn = await isLoggedIn();
  
  if (!loggedIn) {
    // If not logged in, open popup for authentication
    console.log('User not logged in, opening popup');
    return; // Allow default popup to open
  }
  
  // Check if we're on a supported platform
  const platformId = tab.url ? debugPlatformDetection(tab.url) : null;
  
  if (platformId) {
    // We're on a supported platform, check if it's connected
    const isConnected = await isPlatformConnected(platformId);
    
    if (isConnected) {
      // If already connected, bypass popup and go straight to gallery
      console.log('Platform already connected, opening gallery directly');
      openGallery();
      return;
    }
  } else {
    // Not on a supported platform but user is logged in
    // Check if user has any connected platforms
    const hasConnectedPlatforms = await checkForAnyConnectedPlatforms();
    
    if (hasConnectedPlatforms) {
      // If user has any connected platforms, go straight to gallery
      console.log('User has connected platforms, opening gallery directly');
      openGallery();
      return;
    }
  }
  
  // For all other cases, let the popup open normally
  console.log('Opening popup for platform connection or non-platform page');
});

// Check if user has any connected platforms
async function checkForAnyConnectedPlatforms() {
  return new Promise(resolve => {
    chrome.storage.local.get(null, function(items) {
      const platformKeys = Object.keys(items).filter(key => 
        key.startsWith('platform_') && key.endsWith('_connected')
      );
      
      const hasConnected = platformKeys.some(key => items[key] === true);
      console.log('Connected platforms check:', hasConnected ? 'Has connected platforms' : 'No connected platforms');
      resolve(hasConnected);
    });
  });
}

// Listen for auth state changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.main_gallery_auth_token) {
    const isLoggedIn = !!changes.main_gallery_auth_token.newValue;
    console.log('Auth state changed:', isLoggedIn ? 'logged in' : 'logged out');
    
    // Auth token changed, notify content scripts
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { 
          action: 'authStateChanged',
          isLoggedIn: isLoggedIn
        }).catch(() => {
          // Ignore errors for tabs where content script isn't running
        });
      });
    });
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log('Received message:', message.action, 'from:', sender.tab?.url || 'popup');
  
  switch (message.action) {
    case 'contentScriptLoaded':
      // Content script has loaded, check if we're on a supported platform
      if (sender.tab && sender.tab.url) {
        const platformId = debugPlatformDetection(sender.tab.url);
        if (platformId) {
          // Check if user is logged in to MainGallery
          isLoggedIn().then(loggedIn => {
            // Send response with platform detection and login status
            sendResponse({ 
              success: true, 
              platformId: platformId,
              userLoggedIn: loggedIn,
              message: `Detected ${platformId} platform` 
            });
          });
          return true; // Will respond asynchronously
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
      openGallery();
      break;
      
    case 'openAuthPage':
      openAuthPage(message.redirectUrl);
      break;
      
    case 'checkLoginStatus':
      isLoggedIn().then(loggedIn => {
        sendResponse({ isLoggedIn: loggedIn });
      });
      return true; // Will respond asynchronously
      
    case 'isInstalled':
      // Simple ping to check if extension is installed
      sendResponse({ installed: true });
      break;
      
    case 'debug':
      // Log any debug messages
      console.log('Debug:', message.data);
      sendResponse({ received: true });
      break;
  }
  
  // Return true to indicate we'll respond asynchronously
  return true;
});
