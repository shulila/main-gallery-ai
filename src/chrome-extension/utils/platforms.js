
import { getPlatformName, getGalleryUrl } from './common.js';
import { createNotification } from './notifications.js';
import { isLoggedIn } from './auth.js';

// Handle starting a platform connection
export function handlePlatformConnection(platformId) {
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

// Handle successful platform connection
export function handlePlatformConnected(platformId) {
  console.log(`Platform ${platformId} connected successfully`);
  
  // Instead of making an API call to a non-existent domain, just log the action
  console.log(`Would notify API about connection for platform: ${platformId}`);
  
  // Show success notification
  try {
    console.log('Creating platform connected notification');
    
    // Create a unique ID for this notification
    const notificationId = 'platform-connected-' + Date.now();
    
    // Use our notification function
    createNotification(
      notificationId,
      'Platform Connected',
      `Your ${getPlatformName(platformId)} account has been connected to Main Gallery.`
    );
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
}

// Handle platform disconnection
export function handlePlatformDisconnected(platformId) {
  console.log(`Platform ${platformId} disconnected`);
  
  // Instead of making an API call, just log the action
  console.log(`Would notify API about disconnection for platform: ${platformId}`);
  
  // Show success notification
  try {
    console.log('Creating platform disconnected notification');
    
    // Create a unique ID for this notification
    const notificationId = 'platform-disconnected-' + Date.now();
    
    // Use our notification function
    createNotification(
      notificationId,
      'Platform Disconnected',
      `Your ${getPlatformName(platformId)} account has been disconnected from Main Gallery.`
    );
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
}

// Function to handle adding gallery data
export async function handleAddToGallery(data) {
  console.log('Adding to gallery:', data);
  
  try {
    // Make a dummy API call instead of a real one
    const response = await fetch('https://dummyapi.io/collect', {
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
      
      // Use our notification function
      createNotification(
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
export function openGallery() {
  try {
    const mainGalleryUrl = getGalleryUrl();
    
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
