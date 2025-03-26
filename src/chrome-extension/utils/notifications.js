
import { getExtensionResourceUrl, getFallbackIconDataUri } from './common.js';

// Create a notification with proper icon path handling
export function createNotification(id, title, message) {
  try {
    console.log('Creating notification with params:', { id, title, message });
    
    // Validate required parameters
    if (!id || !title || !message) {
      console.error('Missing required notification parameters:', { id, title, message });
      return;
    }
    
    // First try with proper icon 
    tryCreateNotificationWithIcon(id, title, message);
  } catch (error) {
    console.error('Error in notification creation:', error);
    // As a last resort, try text-only notification
    createTextOnlyNotification(id, title, message);
  }
}

// Try to create a notification with proper icon
function tryCreateNotificationWithIcon(id, title, message) {
  // Start with the largest icon and attempt to create the notification
  const iconUrl = getExtensionResourceUrl('icons/icon128.png');
  console.log('Attempting notification with iconUrl:', iconUrl);
  
  chrome.notifications.create(
    id,
    {
      type: 'basic',
      iconUrl: iconUrl,
      title: title,
      message: message,
      priority: 2  // High priority
    },
    function(createdId) {
      if (chrome.runtime.lastError) {
        console.error('Notification creation error with 128px icon:', chrome.runtime.lastError.message || 'Unknown error');
        // Try with the 48px icon
        tryWithSmallerIcon(id, title, message, 48);
      } else {
        console.log('Notification created successfully with ID:', createdId);
      }
    }
  );
}

// Try with smaller icon sizes as fallback
function tryWithSmallerIcon(id, title, message, iconSize) {
  const iconUrl = getExtensionResourceUrl(`icons/icon${iconSize}.png`);
  console.log(`Trying with ${iconSize}px icon:`, iconUrl);
  
  chrome.notifications.create(
    `${id}-${iconSize}px`,
    {
      type: 'basic',
      iconUrl: iconUrl,
      title: title,
      message: message,
      priority: 2
    },
    function(createdId) {
      if (chrome.runtime.lastError) {
        console.error(`Notification creation error with ${iconSize}px icon:`, chrome.runtime.lastError.message);
        // If we tried the 48px icon and it failed, try with 16px
        if (iconSize === 48) {
          tryWithSmallerIcon(id, title, message, 16);
        } else {
          // If even the smallest icon fails, try with data URI
          createTextOnlyNotification(id, title, message);
        }
      } else {
        console.log(`Notification created successfully with ${iconSize}px icon:`, createdId);
      }
    }
  );
}

// Create text-only notification with data URI icon as fallback
function createTextOnlyNotification(id, title, message) {
  console.log('Creating text-only notification as last resort');
  
  const fallbackIcon = getFallbackIconDataUri();
  console.log('Using data URI for icon:', fallbackIcon.substring(0, 30) + '...');
  
  chrome.notifications.create(
    `${id}-text-only`,
    {
      type: 'basic',
      iconUrl: fallbackIcon,
      title: title || 'MainGallery Notification',
      message: message || 'An event occurred in MainGallery',
      priority: 1
    },
    function(createdId) {
      if (chrome.runtime.lastError) {
        console.error('Even text-only notification failed:', chrome.runtime.lastError.message);
      } else {
        console.log('Text-only notification created as fallback:', createdId);
      }
    }
  );
}
