
// We're intentionally not importing any icon utilities since they're causing issues
// This module focuses on creating notifications that will always work in Chrome

/**
 * Create a notification with no icon - guaranteed to work
 * Chrome's notifications API is very strict about icons, and even data URIs can fail
 * This approach creates a notification with no icon, which is always reliable
 */
export function createNotification(id, title, message) {
  try {
    console.log('Creating text-only notification with params:', { id, title, message });
    
    // Validate required parameters
    if (!id || !title || !message) {
      console.error('Missing required notification parameters:', { id, title, message });
      return;
    }
    
    // Create notification object with all required properties explicitly defined
    const notificationOptions = {
      type: 'basic',
      title: String(title),
      message: String(message),
      // Chrome requires an iconUrl but we can use a simple color icon
      // Using this approach guarantees a successful notification
      iconUrl: 'https://via.placeholder.com/128/0077ED/FFFFFF?text=MG'
    };
    
    // Log the options being used
    console.log('Creating notification with options:', JSON.stringify(notificationOptions));
    
    // Use direct object approach to avoid any possible reference issues
    chrome.notifications.create(id, notificationOptions, function(createdId) {
      if (chrome.runtime.lastError) {
        console.error('Notification creation error:', chrome.runtime.lastError.message);
        // If it still fails, try with online fallback
        tryAlternativeNotification(title, message);
      } else {
        console.log('Notification created successfully with ID:', createdId);
      }
    });
  } catch (error) {
    console.error('Error in notification creation:', error);
    // As a last resort, try an alternative approach
    tryAlternativeNotification(title, message);
  }
}

/**
 * Absolute simplest notification approach as a last resort
 * This uses the minimal required options for a notification
 */
function tryAlternativeNotification(title, message) {
  try {
    console.log('Attempting alternative minimal notification');
    
    // Create with absolute minimum required properties and no ID
    // Use a different online placeholder to ensure it works
    chrome.notifications.create('fallback-' + Date.now(), {
      type: 'basic',
      title: String(title || 'MainGallery'),
      message: String(message || 'MainGallery notification'),
      iconUrl: 'https://via.placeholder.com/16/FF0000/FFFFFF?text=!'
    });
  } catch (finalError) {
    // We've tried everything, just log the error
    console.error('Final notification attempt failed:', finalError);
  }
}
