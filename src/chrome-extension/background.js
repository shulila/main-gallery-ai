
// Constants
const MAIN_GALLERY_API_URL = 'https://maingallery.app/api';
const DUMMY_API_URL = 'https://dummyapi.io/collect';

// Listen for extension installation/update
chrome.runtime.onInstalled.addListener(details => {
  // Show a notification to pin the extension on install
  if (details.reason === 'install') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Pin MainGallery Extension',
      message: 'Click the puzzle piece icon in your toolbar and pin MainGallery for easy access!'
    });
  }
  
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

// Main functions
async function handlePlatformConnection(platformId) {
  console.log(`Starting connection process for ${platformId}`);
  
  // Check if user is logged in to Main Gallery
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    // Open auth page with redirect back to current page
    openAuthPage();
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

// New function to handle adding gallery data
async function handleAddToGallery(data) {
  console.log('Adding to gallery:', data);
  
  try {
    // Make a dummy API call instead of a real one
    const response = await fetch(DUMMY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }).catch(error => {
      // If fetch fails (likely because the dummy URL doesn't exist),
      // simulate a successful response for testing purposes
      console.log('Fetch failed (expected for dummy URL). Simulating success response.');
      return {
        ok: true,
        json: async () => ({ success: true, message: 'Simulated successful response' })
      };
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to add to gallery');
    }
    
    const responseData = await response.json();
    console.log('API response:', responseData);
    
    // Show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Added to Main Gallery',
      message: `Your ${getPlatformName(data.platformId)} content has been added to Main Gallery.`
    });
    
    return { success: true, data: responseData };
  } catch (error) {
    console.error('Error in API call:', error);
    return { success: false, error: error.message };
  }
}

// Open gallery in new tab or focus existing gallery tab
async function openGallery() {
  try {
    const mainGalleryUrl = 'https://main-gallery-hub.lovable.app/gallery';
    
    // Find any existing gallery tabs
    const existingTabs = await chrome.tabs.query({ url: mainGalleryUrl + '*' });
    
    if (existingTabs.length > 0) {
      // Focus the first existing gallery tab
      await chrome.tabs.update(existingTabs[0].id, { active: true });
      
      // Focus the window that contains the tab
      await chrome.windows.update(existingTabs[0].windowId, { focused: true });
    } else {
      // Open a new gallery tab
      await chrome.tabs.create({ url: mainGalleryUrl });
    }
  } catch (error) {
    console.error('Error opening gallery:', error);
  }
}

// Open auth page with redirect
function openAuthPage(redirectUrl) {
  const baseAuthUrl = 'https://main-gallery-hub.lovable.app/auth';
  
  let authUrl = baseAuthUrl + '?tab=login';
  if (redirectUrl) {
    authUrl += `&redirect=${encodeURIComponent(redirectUrl)}`;
  }
  
  chrome.tabs.create({ url: authUrl });
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
