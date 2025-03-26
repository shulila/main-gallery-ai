
import { getNotificationIconPath } from './common.js';

/**
 * Create a notification with the most reliable approach for Chrome extensions
 * Chrome is very strict about notification icons - they must be packaged with the extension
 */
export function createNotification(id, title, message) {
  try {
    console.log('Creating notification with params:', { id, title, message });
    
    // Validate required parameters
    if (!id || !title || !message) {
      console.error('Missing required notification parameters');
      return;
    }
    
    // IMPORTANT: For Chrome notifications, we must use a relative path to the icon
    // NOT chrome.runtime.getURL() which doesn't work properly with notifications
    const iconPath = getNotificationIconPath(128);
    
    console.log('Using icon path for notification:', iconPath);
    
    // Create notification with the correct icon path format
    const notificationOptions = {
      type: 'basic',
      title: String(title),
      message: String(message),
      iconUrl: iconPath
    };
    
    // Log complete options for debugging
    console.log('Creating notification with options:', JSON.stringify(notificationOptions));
    
    // Create the notification
    chrome.notifications.create(id, notificationOptions, function(createdId) {
      if (chrome.runtime.lastError) {
        console.error('Notification creation error:', chrome.runtime.lastError.message);
        // Try with a smaller icon as fallback
        tryWithSmallerIcon(id, title, message);
      } else {
        console.log('Notification created successfully with ID:', createdId);
      }
    });
  } catch (error) {
    console.error('Error in notification creation:', error);
    // Try with smaller icon as fallback
    tryWithSmallerIcon(id, title, message);
  }
}

/**
 * Fallback function that tries with a smaller icon
 * Sometimes Chrome has issues with larger icons
 */
function tryWithSmallerIcon(id, title, message) {
  try {
    console.log('Attempting notification with smaller icon');
    
    // Use 16px icon as fallback
    const smallIconPath = getNotificationIconPath(16);
    
    console.log('Using small icon path:', smallIconPath);
    
    // Create notification with smaller icon
    chrome.notifications.create(`${id}-small`, {
      type: 'basic',
      title: String(title || 'MainGallery'),
      message: String(message || 'MainGallery notification'),
      iconUrl: smallIconPath
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
