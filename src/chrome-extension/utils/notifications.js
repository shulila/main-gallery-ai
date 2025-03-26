
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
    
    // Create a notification without any iconUrl at all - this should always work
    const options = {
      type: 'basic',
      title: title,
      message: message,
      priority: 2,
      // Intentionally NOT including an iconUrl property
      // Chrome will use a default icon when none is provided
    };
    
    // Log the options being used
    console.log('Creating notification with options:', JSON.stringify(options));
    
    // Create the notification without an icon
    chrome.notifications.create(
      id,
      options,
      function(createdId) {
        if (chrome.runtime.lastError) {
          console.error('Notification creation error:', chrome.runtime.lastError.message);
          // If it still fails somehow, try one more approach
          tryAlternativeNotification(title, message);
        } else {
          console.log('Notification created successfully with ID:', createdId);
        }
      }
    );
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
    chrome.notifications.create({
      type: 'basic',
      title: title || 'MainGallery',
      message: message || 'MainGallery notification'
      // No other properties
    });
  } catch (finalError) {
    // We've tried everything, just log the error
    console.error('Final notification attempt failed:', finalError);
  }
}
