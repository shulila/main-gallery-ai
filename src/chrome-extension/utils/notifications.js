
import { getNotificationIconDataUri } from './common.js';

// Create a notification with a guaranteed-to-work data URI icon
export function createNotification(id, title, message) {
  try {
    console.log('Creating notification with params:', { id, title, message });
    
    // Validate required parameters
    if (!id || !title || !message) {
      console.error('Missing required notification parameters:', { id, title, message });
      return;
    }
    
    // Get the data URI icon - this will ALWAYS work
    const iconDataUri = getNotificationIconDataUri();
    console.log('Using data URI icon for notification');
    
    // Create options object with data URI icon
    const options = {
      type: 'basic',
      iconUrl: iconDataUri, // Use data URI icon directly
      title: title,
      message: message,
      priority: 2
    };
    
    // Log the full options being used
    console.log('Creating notification with options:', JSON.stringify(options));
    
    // Create notification with data URI icon
    chrome.notifications.create(
      id,
      options,
      function(createdId) {
        if (chrome.runtime.lastError) {
          console.error('Notification creation error:', chrome.runtime.lastError.message);
          console.error('Failed notification options:', JSON.stringify(options));
          
          // If it still fails, try an even more minimal approach
          createSimpleNotification(title, message);
        } else {
          console.log('Notification created successfully with ID:', createdId);
        }
      }
    );
  } catch (error) {
    console.error('Error in notification creation:', error);
    // As a last resort, try a super simple notification
    createSimpleNotification(title, message);
  }
}

// Absolute simplest fallback notification
function createSimpleNotification(title, message) {
  try {
    console.log('Creating simple fallback notification');
    
    // Create a completely basic notification with minimal options
    chrome.notifications.create({
      type: 'basic',
      title: title || 'MainGallery Notification',
      message: message || 'An event occurred in MainGallery',
      iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
    });
  } catch (finalError) {
    // No more fallbacks - just log the error
    console.error('Final notification attempt failed:', finalError);
  }
}
