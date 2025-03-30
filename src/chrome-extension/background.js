
import { setupAuthCallbackListener, openAuthPage, openAuthWithProvider, isLoggedIn, logout } from './utils/auth.js';
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
      
      // Use chrome notifications API
      chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Welcome to MainGallery.AI',
        message: 'Pin this extension for quick access to your AI art gallery!'
      });
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
      });
    }
  }
});

// Extension icon click handler with direct gallery open optimization
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension icon clicked in toolbar');
  
  // Check if user is logged in to MainGallery
  const loggedIn = await isLoggedIn();
  
  if (loggedIn) {
    // If user is logged in, go directly to gallery
    console.log('User is logged in, opening gallery directly');
    openGallery();
    return;
  }
  
  // User is not logged in, open auth page
  console.log('User not logged in, opening auth page');
  openAuthPage();
});

// Function to open the gallery
function openGallery() {
  const galleryUrl = "https://main-gallery-hub.lovable.app/gallery";
  console.log('Opening gallery at', galleryUrl);
  
  // Check if gallery tab is already open
  chrome.tabs.query({ url: `${galleryUrl}*` }, (tabs) => {
    if (tabs && tabs.length > 0) {
      // Gallery tab exists, focus it
      chrome.tabs.update(tabs[0].id, { active: true });
    } else {
      // Gallery tab doesn't exist, open a new one
      chrome.tabs.create({ url: galleryUrl });
    }
  });
}

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log('Received message:', message.action, 'from:', sender.tab?.url || 'popup');
  
  switch (message.action) {
    case 'openGallery':
      openGallery();
      break;
      
    case 'openAuthPage':
      openAuthPage();
      break;
      
    case 'openAuthWithProvider':
      openAuthWithProvider(message.provider);
      break;
      
    case 'checkLoginStatus':
      isLoggedIn().then(loggedIn => {
        sendResponse({ isLoggedIn: loggedIn });
      });
      return true; // Will respond asynchronously
      
    case 'logout':
      logout().then(() => {
        sendResponse({ success: true });
      });
      return true; // Will respond asynchronously
  }
  
  // Return true if we plan to respond asynchronously
  return true;
});
