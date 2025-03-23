
// Constants
const MAIN_GALLERY_API_URL = 'https://maingallery.app/api';

// Listen for extension installation/update
chrome.runtime.onInstalled.addListener(details => {
  // Removed automatic tab opening on install
  console.log('Extension installed:', details.reason);
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
  }
  
  // Return true to indicate we'll respond asynchronously
  return true;
});

// Main functions
async function handlePlatformConnection(platformId) {
  console.log(`Starting connection process for ${platformId}`);
  
  // Check if user is logged in to Main Gallery
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    // Instead of opening a tab, we'll just log this for now
    console.log('User not logged in, authentication required');
    return;
  }
  
  // Open popup to handle connection
  chrome.action.openPopup();
}

async function handlePlatformConnected(platformId) {
  console.log(`Platform ${platformId} connected successfully`);
  
  // Instead of making an API call to a non-existent domain, just log the action
  console.log(`Would notify API about connection for platform: ${platformId}`);
  
  // Show success notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Platform Connected',
    message: `Your ${getPlatformName(platformId)} account has been connected to Main Gallery.`
  });
}

async function handlePlatformDisconnected(platformId) {
  console.log(`Platform ${platformId} disconnected`);
  
  // Instead of making an API call, just log the action
  console.log(`Would notify API about disconnection for platform: ${platformId}`);
  
  // Show success notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Platform Disconnected',
    message: `Your ${getPlatformName(platformId)} account has been disconnected from Main Gallery.`
  });
}

// Helper functions
function getPlatformName(platformId) {
  const platformNames = {
    midjourney: 'Midjourney',
    dalle: 'DALL·E',
    stableDiffusion: 'Stable Diffusion',
    runway: 'Runway',
    pika: 'Pika'
  };
  
  return platformNames[platformId] || platformId;
}

async function isLoggedIn() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['main_gallery_auth_token'], result => {
      resolve(!!result.main_gallery_auth_token);
    });
  });
}

async function getAuthToken() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['main_gallery_auth_token'], result => {
      resolve(result.main_gallery_auth_token || null);
    });
  });
}

// Check for non-existent webNavigation API before using it
if (chrome.webNavigation) {
  chrome.webNavigation.onCompleted.addListener(details => {
    if (details.url.startsWith('https://maingallery.app/auth/callback')) {
      // Extract token from URL
      const url = new URL(details.url);
      const token = url.searchParams.get('token');
      
      if (token) {
        // Store the token
        chrome.storage.sync.set({ main_gallery_auth_token: token }, () => {
          console.log('Authentication token saved');
          
          // Notify any open popup to update UI
          chrome.runtime.sendMessage({
            action: 'updateUI'
          });
          
          // Close the auth tab
          chrome.tabs.remove(details.tabId);
        });
      }
    }
  }, { url: [{ urlPrefix: 'https://maingallery.app/auth/callback' }] });
}
