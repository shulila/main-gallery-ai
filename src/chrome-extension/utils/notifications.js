
import { getExtensionResourceUrl } from './common.js';

// Create a notification with proper icon and fallback handling
export function createNotification(id, title, message) {
  try {
    console.log('Creating notification with params:', { id, title, message });
    
    // Validate required parameters
    if (!id || !title || !message) {
      console.error('Missing required notification parameters:', { id, title, message });
      return;
    }
    
    // Get the absolute icon URL
    const iconUrl = getExtensionResourceUrl('icons/icon128.png');
    console.log('Using icon URL:', iconUrl);
    
    // Create notification with all required properties
    chrome.notifications.create(
      id,
      {
        type: 'basic',
        iconUrl: iconUrl,
        title: title,
        message: message,
      },
      function(createdId) {
        if (chrome.runtime.lastError) {
          console.error('Notification creation error:', chrome.runtime.lastError.message);
          // Try with a smaller icon as fallback
          tryWithSmallerIcon(id, title, message);
        } else {
          console.log('Notification created with ID:', createdId);
        }
      }
    );
  } catch (error) {
    console.error('Error in notification creation:', error);
    tryWithSmallerIcon(id, title, message);
  }
}

// Fallback to smaller icon if 128px icon fails
function tryWithSmallerIcon(id, title, message) {
  try {
    const smallerIconUrl = getExtensionResourceUrl('icons/icon16.png');
    console.log('Trying with smaller icon:', smallerIconUrl);
    
    chrome.notifications.create(
      `${id}-smaller`,
      {
        type: 'basic',
        iconUrl: smallerIconUrl,
        title: title,
        message: message,
      },
      function(createdId) {
        if (chrome.runtime.lastError) {
          console.error('Smaller icon notification also failed:', chrome.runtime.lastError.message);
          // Final fallback - text-only notification
          createTextOnlyNotification(id, title, message);
        } else {
          console.log('Notification with smaller icon created:', createdId);
        }
      }
    );
  } catch (error) {
    console.error('Error in smaller icon notification:', error);
    createTextOnlyNotification(id, title, message);
  }
}

// Last resort - text-only notification without icon
function createTextOnlyNotification(id, title, message) {
  try {
    console.log('Creating text-only notification as last resort');
    
    chrome.notifications.create(
      `${id}-text-only`,
      {
        type: 'basic',
        title: title || 'MainGallery Notification',
        message: message || 'An event occurred in MainGallery',
        // Chrome requires iconUrl but will use default icon if loading fails
        iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFeQI4W7hGgwAAAABJRU5ErkJggg=='
      },
      function(createdId) {
        if (chrome.runtime.lastError) {
          console.error('Even text-only notification failed:', chrome.runtime.lastError.message);
        } else {
          console.log('Text-only notification created as fallback:', createdId);
        }
      }
    );
  } catch (error) {
    console.error('Error in text-only notification:', error);
  }
}
