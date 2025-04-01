
/**
 * Create a notification in the extension or browser
 * @param {string} id Unique notification ID
 * @param {string} title Notification title
 * @param {string} message Notification message
 * @param {Object} options Additional notification options
 * @returns {Promise<string>} Notification ID
 */
export const createNotification = (id, title, message, options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      // If chrome.notifications is available, use it
      if (typeof chrome !== 'undefined' && chrome.notifications) {
        chrome.notifications.create(id, {
          type: 'basic',
          iconUrl: options.icon || 'icons/icon128.png',
          title: title,
          message: message,
          priority: options.priority || 0,
          ...options
        }, (notificationId) => {
          resolve(notificationId);
        });
      } else {
        // Fallback to browser notifications
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          const notification = new Notification(title, {
            body: message,
            icon: options.icon || '/icons/icon128.png',
          });
          resolve(notification);
        } else if (typeof Notification !== 'undefined' && Notification.permission !== 'denied') {
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              const notification = new Notification(title, {
                body: message,
                icon: options.icon || '/icons/icon128.png',
              });
              resolve(notification);
            } else {
              // Fall back to alert for simplicity
              alert(`${title}: ${message}`);
              resolve(id);
            }
          });
        } else {
          // Fall back to alert
          alert(`${title}: ${message}`);
          resolve(id);
        }
      }
    } catch (error) {
      console.error('Error creating notification:', error);
      // Final fallback
      try {
        alert(`${title}: ${message}`);
      } catch (e) {
        // Silent failure if even alert fails
      }
      reject(error);
    }
  });
};

/**
 * Display a toast notification in-page by injecting an element
 * @param {string} message The message to display
 * @param {string} type The type of toast ('info', 'warning', 'error', 'success')
 * @param {number} duration Duration in ms before auto-hiding
 * @returns {HTMLElement} The created toast element
 */
export const showInPageToast = (message, type = 'info', duration = 5000) => {
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById('maingallery-toast-container');
  
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'maingallery-toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 320px;
      width: 100%;
      pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }
  
  // Create the toast element
  const toast = document.createElement('div');
  
  // Set toast type-specific styles
  let backgroundColor, textColor, borderColor;
  let icon = '';
  
  switch (type) {
    case 'success':
      backgroundColor = 'rgba(34, 197, 94, 0.9)';
      textColor = 'white';
      borderColor = 'rgb(34, 197, 94)';
      icon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
      `;
      break;
    case 'error':
      backgroundColor = 'rgba(239, 68, 68, 0.9)';
      textColor = 'white';
      borderColor = 'rgb(239, 68, 68)';
      icon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      `;
      break;
    case 'warning':
      backgroundColor = 'rgba(245, 158, 11, 0.9)';
      textColor = 'white';
      borderColor = 'rgb(245, 158, 11)';
      icon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
      `;
      break;
    default: // info
      backgroundColor = 'rgba(59, 130, 246, 0.9)';
      textColor = 'white';
      borderColor = 'rgb(59, 130, 246)';
      icon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      `;
      break;
  }
  
  // Set toast styling
  toast.style.cssText = `
    background-color: ${backgroundColor};
    color: ${textColor};
    border-left: 4px solid ${borderColor};
    padding: 12px 16px;
    border-radius: 4px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    opacity: 0;
    transform: translateY(-20px);
    transition: opacity 0.3s, transform 0.3s;
    pointer-events: auto;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  `;
  
  // Set inner HTML with icon and message
  toast.innerHTML = `
    <div class="maingallery-toast-icon">${icon}</div>
    <div class="maingallery-toast-message" style="flex: 1;">
      <div style="font-weight: 500; margin-bottom: 2px;">MainGallery.AI</div>
      <div style="font-size: 14px;">${message}</div>
    </div>
    <div class="maingallery-toast-close" style="cursor: pointer; color: ${textColor}; opacity: 0.7;">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    </div>
  `;
  
  // Add to container
  toastContainer.appendChild(toast);
  
  // Add event listener to close button
  const closeBtn = toast.querySelector('.maingallery-toast-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      hideToast(toast);
    });
  }
  
  // Trigger animation and set timeout to remove
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }, 10);
  
  // Auto hide after duration
  setTimeout(() => {
    hideToast(toast);
  }, duration);
  
  return toast;
};

/**
 * Hide and remove a toast element
 * @param {HTMLElement} toast The toast element to hide
 */
const hideToast = (toast) => {
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(-20px)';
  
  setTimeout(() => {
    // Remove the toast
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
    
    // Check if container is empty and can be removed
    const container = document.getElementById('maingallery-toast-container');
    if (container && container.children.length === 0) {
      document.body.removeChild(container);
    }
  }, 300); // Corresponds to the transition duration
};

/**
 * Show an error toast when on unsupported tabs
 * @param {string} message The message to display
 */
export const showUnsupportedTabToast = (message = "Please switch to a supported AI platform (Midjourney, DALL·E, etc) to use MainGallery.AI") => {
  showInPageToast(message, 'warning');
};
