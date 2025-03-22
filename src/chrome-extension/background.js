
// Constants
const MAIN_GALLERY_API_URL = 'https://maingallery.app/api';

// Listen for extension installation/update
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    // Open onboarding page on install
    chrome.tabs.create({ url: 'https://maingallery.app/welcome' });
  }
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
    // Prompt user to log in
    chrome.windows.create({
      url: 'https://maingallery.app/auth?redirect=extension',
      type: 'popup',
      width: 480,
      height: 700
    });
    return;
  }
  
  // Open popup to handle connection
  chrome.action.openPopup();
}

async function handlePlatformConnected(platformId) {
  console.log(`Platform ${platformId} connected successfully`);
  
  // Notify the Main Gallery API about the connection
  try {
    const authToken = await getAuthToken();
    if (!authToken) throw new Error('Not logged in');
    
    const response = await fetch(`${MAIN_GALLERY_API_URL}/platforms/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        platform: platformId,
        connectedAt: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    // Show success notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Platform Connected',
      message: `Your ${getPlatformName(platformId)} account has been connected to Main Gallery.`
    });
    
  } catch (error) {
    console.error('Error notifying API about connection:', error);
    
    // Show error notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Connection Error',
      message: `There was a problem connecting your ${getPlatformName(platformId)} account. Please try again.`
    });
  }
}

async function handlePlatformDisconnected(platformId) {
  console.log(`Platform ${platformId} disconnected`);
  
  // Notify the Main Gallery API about the disconnection
  try {
    const authToken = await getAuthToken();
    if (!authToken) throw new Error('Not logged in');
    
    const response = await fetch(`${MAIN_GALLERY_API_URL}/platforms/disconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        platform: platformId
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    // Show success notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Platform Disconnected',
      message: `Your ${getPlatformName(platformId)} account has been disconnected from Main Gallery.`
    });
    
  } catch (error) {
    console.error('Error notifying API about disconnection:', error);
  }
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

// Listen for auth state changes from the website
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
