
// Create a notification using local icon files
export function createNotification(id, title, message) {
  try {
    console.log('Creating notification with params:', { id, title, message });
    
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
      // Use relative path - Chrome will resolve this against the extension's root
      iconUrl: 'icons/icon128.png'
    };
    
    // Log the options being used
    console.log('Creating notification with options:', JSON.stringify(notificationOptions));
    
    // Use direct object approach to avoid any possible reference issues
    chrome.notifications.create(id, notificationOptions, function(createdId) {
      if (chrome.runtime.lastError) {
        console.error('Notification creation error:', chrome.runtime.lastError.message);
        // If it still fails, try with smaller icon
        tryWithSmallerIcon(id, title, message);
      } else {
        console.log('Notification created successfully with ID:', createdId);
      }
    });
  } catch (error) {
    console.error('Error in notification creation:', error);
    // As a last resort, try an alternative approach
    tryWithSmallerIcon(id, title, message);
  }
}

/**
 * Fallback function that tries with a smaller icon
 * Sometimes Chrome has issues with larger icons
 */
function tryWithSmallerIcon(id, title, message) {
  try {
    console.log('Attempting with smaller icon');
    
    // Try with smaller icon (16px)
    chrome.notifications.create(`${id}-small`, {
      type: 'basic',
      title: String(title || 'MainGallery'),
      message: String(message || 'MainGallery notification'),
      iconUrl: 'icons/icon16.png'
    }, function(createdId) {
      if (chrome.runtime.lastError) {
        console.error('Small icon notification failed:', chrome.runtime.lastError.message);
        // Last resort - try with no options at all
        tryTextOnlyNotification(title, message);
      } else {
        console.log('Small icon notification created successfully:', createdId);
      }
    });
  } catch (finalError) {
    console.error('Small icon notification attempt failed:', finalError);
    tryTextOnlyNotification(title, message);
  }
}

/**
 * Last resort notification with minimal properties
 */
function tryTextOnlyNotification(title, message) {
  try {
    console.log('Attempting text-only notification');
    
    // Create with absolute minimum required properties
    chrome.notifications.create({
      type: 'basic',
      title: String(title || 'MainGallery'),
      message: String(message || 'MainGallery notification'),
      iconUrl: 'icons/icon48.png'
    });
  } catch (finalError) {
    // We've tried everything, just log the error
    console.error('Final notification attempt failed:', finalError);
  }
}
