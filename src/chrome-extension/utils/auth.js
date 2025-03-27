
// Open auth page with redirect
export function openAuthPage(redirectUrl) {
  let authUrl = 'https://main-gallery-hub.lovable.app/auth?from=extension';
  
  if (redirectUrl) {
    authUrl += `&redirect=${encodeURIComponent(redirectUrl)}`;
  }
  
  // Add a timestamp to prevent caching issues
  authUrl += `&t=${Date.now()}`;
  
  console.log('Opening auth page with URL:', authUrl);
  
  chrome.tabs.create({ url: authUrl }, function(tab) {
    if (chrome.runtime.lastError) {
      console.error('Error opening auth page:', chrome.runtime.lastError);
    } else {
      console.log('Auth page opened in tab:', tab.id);
      
      // Set up a tab monitor to detect if the tab is closed before auth completes
      setTimeout(() => {
        chrome.tabs.get(tab.id, function(currentTab) {
          if (chrome.runtime.lastError) {
            // Tab likely closed
            console.log('Auth tab closed or error:', chrome.runtime.lastError.message);
          }
        });
      }, 3000);
    }
  });
}

// Check if user is logged in to Main Gallery
export function isLoggedIn() {
  return new Promise(function(resolve) {
    chrome.storage.sync.get(['main_gallery_auth_token'], function(result) {
      const isLoggedIn = !!result.main_gallery_auth_token;
      console.log('Auth check: user is logged in =', isLoggedIn);
      resolve(isLoggedIn);
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
      console.log('Navigation detected to:', details.url);
      
      // Check if this is an auth callback URL
      if (details.url.includes('/auth/callback') && 
          (details.url.includes('maingallery.app') || 
           details.url.includes('main-gallery.ai') || 
           details.url.includes('main-gallery-hub.lovable.app'))) {
        
        console.log('Auth callback detected:', details.url);
        
        // Extract token from URL
        try {
          const url = new URL(details.url);
          const token = url.searchParams.get('token');
          
          if (token) {
            console.log('Token found in callback URL, storing token');
            
            // Store the token
            chrome.storage.sync.set({ main_gallery_auth_token: token }, function() {
              console.log('Authentication token saved successfully');
              
              // Get the redirect URL if available
              const redirect = url.searchParams.get('redirect');
              
              // Notify any open popup to update UI
              chrome.runtime.sendMessage({
                action: 'updateUI'
              });
              
              // Notify content scripts about auth state change
              chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                  chrome.tabs.sendMessage(tab.id, { 
                    action: 'authStateChanged',
                    isLoggedIn: true
                  }).catch(() => {
                    // Ignore errors for tabs where content script isn't running
                  });
                });
              });
              
              // Show success notification
              if (chrome.notifications) {
                chrome.notifications.create('auth-success', {
                  type: 'basic',
                  iconUrl: 'icons/icon128.png',
                  title: 'MainGallery Connected',
                  message: 'You are now connected to MainGallery!'
                });
              }
              
              // Close the auth tab with a small delay to ensure data is saved
              setTimeout(() => {
                chrome.tabs.remove(details.tabId, function() {
                  if (chrome.runtime.lastError) {
                    console.error('Error closing tab:', chrome.runtime.lastError);
                  }
                  
                  // If we have a redirect URL, navigate back to it
                  if (redirect) {
                    chrome.tabs.create({ url: redirect });
                  }
                });
              }, 500);
            });
          } else {
            console.error('No token found in callback URL');
          }
        } catch (error) {
          console.error('Error processing auth callback:', error);
        }
      }
    }, { 
      url: [
        { urlContains: 'maingallery.app/auth/callback' },
        { urlContains: 'main-gallery.ai/auth/callback' },
        { urlContains: 'main-gallery-hub.lovable.app/auth/callback' }
      ] 
    });
  } else {
    console.warn('webNavigation API not available, auth callback listener not set up');
    
    // Fallback: Check for auth token periodically
    setInterval(() => {
      chrome.tabs.query({ url: [
        '*://maingallery.app/auth/callback*',
        '*://main-gallery.ai/auth/callback*',
        '*://main-gallery-hub.lovable.app/auth/callback*'
      ]}, (tabs) => {
        if (tabs.length > 0) {
          const callbackTab = tabs[0];
          const url = new URL(callbackTab.url);
          const token = url.searchParams.get('token');
          
          if (token) {
            console.log('Token found in callback URL via polling, storing token');
            
            // Store the token
            chrome.storage.sync.set({ main_gallery_auth_token: token }, function() {
              console.log('Authentication token saved successfully via polling');
              
              // Similar logic as above, but through polling
              // Get the redirect URL if available
              const redirect = url.searchParams.get('redirect');
              
              // Notify about auth state change and close tab
              // (similar actions as in the main callback handler)
              chrome.runtime.sendMessage({ action: 'updateUI' });
              
              // Close the auth tab and potentially redirect
              setTimeout(() => {
                chrome.tabs.remove(callbackTab.id);
                if (redirect) {
                  chrome.tabs.create({ url: redirect });
                }
              }, 500);
            });
          }
        }
      });
    }, 2000); // Check every 2 seconds
  }
}

// Log out user by removing auth token
export function logout() {
  return new Promise(function(resolve) {
    console.log('Logging out user...');
    
    chrome.storage.sync.remove(['main_gallery_auth_token'], function() {
      console.log('User logged out successfully');
      
      // Notify content scripts about auth state change
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { 
            action: 'authStateChanged',
            isLoggedIn: false
          }).catch(() => {
            // Ignore errors for tabs where content script isn't running
          });
        });
      });
      
      resolve();
    });
  });
}
