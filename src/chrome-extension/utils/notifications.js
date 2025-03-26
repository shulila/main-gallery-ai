
import { getExtensionResourceUrl, getNotificationIconPath } from './common.js';

/**
 * Create a notification using local icon files
 * Chrome extensions must use local files defined in the manifest for notification icons
 */
export function createNotification(id, title, message) {
  try {
    console.log('Creating notification with params:', { id, title, message });
    
    // Validate required parameters
    if (!id || !title || !message) {
      console.error('Missing required notification parameters:', { id, title, message });
      return;
    }
    
    // Use the default icon from the extension's package
    // This is crucial - we must use a local file path
    const iconPath = getNotificationIconPath(128);
    const iconUrl = getExtensionResourceUrl(iconPath);
    
    console.log('Using local icon for notification:', iconUrl);
    
    // Create notification with proper local icon path
    const notificationOptions = {
      type: 'basic',
      title: String(title),
      message: String(message),
      iconUrl: iconUrl
    };
    
    // Log options being used
    console.log('Creating notification with options:', JSON.stringify(notificationOptions));
    
    // Create notification
    chrome.notifications.create(id, notificationOptions, function(createdId) {
      if (chrome.runtime.lastError) {
        console.error('Notification creation error:', chrome.runtime.lastError.message);
        // If the main icon fails, try with a smaller icon
        tryWithSmallerIcon(id, title, message);
      } else {
        console.log('Notification created successfully with ID:', createdId);
      }
    });
  } catch (error) {
    console.error('Error in notification creation:', error);
    // Try a simpler approach
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
    const smallIconPath = getNotificationIconPath(16);
    const smallIconUrl = getExtensionResourceUrl(smallIconPath);
    
    // Create with smaller icon
    chrome.notifications.create(`${id}-small`, {
      type: 'basic',
      title: String(title || 'MainGallery'),
      message: String(message || 'MainGallery notification'),
      iconUrl: smallIconUrl
    }, function(createdId) {
      if (chrome.runtime.lastError) {
        console.error('Small icon notification failed:', chrome.runtime.lastError.message);
      } else {
        console.log('Small icon notification created successfully:', createdId);
      }
    });
  } catch (finalError) {
    console.error('Final notification attempt failed:', finalError);
  }
}
