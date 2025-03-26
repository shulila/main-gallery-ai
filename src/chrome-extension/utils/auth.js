
// Open auth page with redirect
export function openAuthPage(redirectUrl) {
  let authUrl = 'https://main-gallery-hub.lovable.app/auth?from=extension';
  
  if (redirectUrl) {
    authUrl += `&redirect=${encodeURIComponent(redirectUrl)}`;
  }
  
  chrome.tabs.create({ url: authUrl }, function() {
    if (chrome.runtime.lastError) {
      console.error('Error opening auth page:', chrome.runtime.lastError);
    }
  });
}

// Check if user is logged in to Main Gallery
export function isLoggedIn() {
  return new Promise(function(resolve) {
    chrome.storage.sync.get(['main_gallery_auth_token'], function(result) {
      resolve(!!result.main_gallery_auth_token);
    });
  });
}

// Get the auth token if available
export function getAuthToken() {
  return new Promise(function(resolve) {
    chrome.storage.sync.get(['main_gallery_auth_token'], function(result) {
      resolve(result.main_gallery_auth_token || null);
    });
  });
}

// Handle authentication callback
export function setupAuthCallbackListener() {
  // Check for non-existent webNavigation API before using it
  if (chrome.webNavigation) {
    chrome.webNavigation.onCompleted.addListener(function(details) {
      if (details.url.startsWith('https://maingallery.app/auth/callback')) {
        // Extract token from URL
        const url = new URL(details.url);
        const token = url.searchParams.get('token');
        
        if (token) {
          // Store the token
          chrome.storage.sync.set({ main_gallery_auth_token: token }, function() {
            console.log('Authentication token saved');
            
            // Notify any open popup to update UI
            chrome.runtime.sendMessage({
              action: 'updateUI'
            });
            
            // Close the auth tab
            chrome.tabs.remove(details.tabId, function() {
              if (chrome.runtime.lastError) {
                console.error('Error closing tab:', chrome.runtime.lastError);
              }
            });
          });
        }
      }
    }, { url: [{ urlPrefix: 'https://maingallery.app/auth/callback' }] });
  }
}
