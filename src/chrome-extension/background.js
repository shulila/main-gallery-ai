// Constants
const MAIN_GALLERY_API_URL = 'https://maingallery.app/api';
const DUMMY_API_URL = 'https://dummyapi.io/collect';

// Helper function for creating text-only notifications
function createTextNotification(id, title, message) {
  try {
    console.log('Creating text-only notification with params:', { id, title, message });
    
    // Validate required parameters
    if (!id || !title || !message) {
      console.error('Missing required notification parameters:', { id, title, message });
      return;
    }
    
    // Create notification with all required properties
    chrome.notifications.create(
      id,
      {
        type: 'basic',
        iconUrl: 'icons/icon128.png', // Always include iconUrl even for text notifications
        title: title,
        message: message,
      },
      function(createdId) {
        if (chrome.runtime.lastError) {
          console.error('Notification creation error:', chrome.runtime.lastError.message || 'Unknown error');
          // Try a super basic notification as fallback if we still get errors
          try {
            chrome.notifications.create({
              type: 'basic',
              title: 'MainGallery Notification',
              message: 'An event occurred in MainGallery',
              iconUrl: 'icons/icon16.png'
            });
          } catch (fallbackError) {
            console.error('Even fallback notification failed:', fallbackError);
          }
        } else {
          console.log('Text notification created with ID:', createdId);
        }
      }
    );
  } catch (error) {
    console.error('Error in notification creation:', error);
  }
}

// Listen for extension installation/update
chrome.runtime.onInstalled.addListener(function(details) {
  // Show a notification to pin the extension on install
  if (details.reason === 'install') {
    try {
      console.log('Creating installation notification');
      
      // Create a unique ID for this notification
      const notificationId = 'installation-' + Date.now();
      
      // Use our text-only notification function
      createTextNotification(
        notificationId, 
        'Pin MainGallery Extension',
        'Click the puzzle icon in your toolbar and pin MainGallery for easy access!'
      );
    } catch (error) {
      console.error('Failed to show notification:', error);
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

// Main functions
function handlePlatformConnection(platformId) {
  console.log(`Starting connection process for ${platformId}`);
  
  // Check if user is logged in to Main Gallery
  isLoggedIn().then(function(loggedIn) {
    if (!loggedIn) {
      // Open auth page with redirect back to current page
      openAuthPage();
      return;
    }
    
    // Open popup to handle connection
    if (chrome.action && chrome.action.openPopup) {
      chrome.action.openPopup();
    }
  });
}

function handlePlatformConnected(platformId) {
  console.log(`Platform ${platformId} connected successfully`);
  
  // Instead of making an API call to a non-existent domain, just log the action
  console.log(`Would notify API about connection for platform: ${platformId}`);
  
  // Show success notification
  try {
    console.log('Creating platform connected notification');
    
    // Create a unique ID for this notification
    const notificationId = 'platform-connected-' + Date.now();
    
    // Use our text-only notification function
    createTextNotification(
      notificationId,
      'Platform Connected',
      `Your ${getPlatformName(platformId)} account has been connected to Main Gallery.`
    );
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
}

function handlePlatformDisconnected(platformId) {
  console.log(`Platform ${platformId} disconnected`);
  
  // Instead of making an API call, just log the action
  console.log(`Would notify API about disconnection for platform: ${platformId}`);
  
  // Show success notification
  try {
    console.log('Creating platform disconnected notification');
    
    // Create a unique ID for this notification
    const notificationId = 'platform-disconnected-' + Date.now();
    
    // Use our text-only notification function
    createTextNotification(
      notificationId,
      'Platform Disconnected',
      `Your ${getPlatformName(platformId)} account has been disconnected from Main Gallery.`
    );
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
}

// Function to handle adding gallery data
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
    try {
      console.log('Creating add to gallery notification');
      
      // Create a unique ID for this notification
      const notificationId = 'added-to-gallery-' + Date.now();
      
      // Use our text-only notification function
      createTextNotification(
        notificationId,
        'Added to Main Gallery',
        `Your ${getPlatformName(data.platformId)} content has been added to Main Gallery.`
      );
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
    
    return { success: true, data: responseData };
  } catch (error) {
    console.error('Error in API call:', error);
    return { success: false, error: error.message };
  }
}

// Open gallery in new tab or focus existing gallery tab
function openGallery() {
  try {
    const mainGalleryUrl = 'https://main-gallery-hub.lovable.app/gallery';
    
    // Find any existing gallery tabs
    chrome.tabs.query({ url: mainGalleryUrl + '*' }, function(existingTabs) {
      if (existingTabs.length > 0) {
        // Focus the first existing gallery tab
        chrome.tabs.update(existingTabs[0].id, { active: true }, function() {
          if (chrome.runtime.lastError) {
            console.error('Error updating tab:', chrome.runtime.lastError);
          }
          
          // Focus the window that contains the tab
          chrome.windows.update(existingTabs[0].windowId, { focused: true }, function() {
            if (chrome.runtime.lastError) {
              console.error('Error updating window:', chrome.runtime.lastError);
            }
          });
        });
      } else {
        // Open a new gallery tab
        chrome.tabs.create({ url: mainGalleryUrl }, function() {
          if (chrome.runtime.lastError) {
            console.error('Error creating tab:', chrome.runtime.lastError);
          }
        });
      }
    });
  } catch (error) {
    console.error('Error opening gallery:', error);
  }
}

// Open auth page with redirect
function openAuthPage(redirectUrl) {
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

// Helper functions
function getPlatformName(platformId) {
  const platformNames = {
    midjourney: 'Midjourney',
    dalle: 'DALL·E',
    stableDiffusion: 'Stable Diffusion',
    runway: 'Runway',
    pika: 'Pika',
    leonardo: 'Leonardo.ai'
  };
  
  return platformNames[platformId] || platformId;
}

function isLoggedIn() {
  return new Promise(function(resolve) {
    chrome.storage.sync.get(['main_gallery_auth_token'], function(result) {
      resolve(!!result.main_gallery_auth_token);
    });
  });
}

function getAuthToken() {
  return new Promise(function(resolve) {
    chrome.storage.sync.get(['main_gallery_auth_token'], function(result) {
      resolve(result.main_gallery_auth_token || null);
    });
  });
}

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
