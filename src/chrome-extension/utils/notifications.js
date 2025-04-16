
/**
 * Notification utilities for MainGallery.AI Chrome Extension
 */

import { logger } from './logger.js';
import { handleError, ErrorTypes } from './error-handler.js';

/**
 * Notification types
 */
export const NotificationType = {
  SUCCESS: 'success',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error'
};

/**
 * Create a Chrome notification
 * @param {string} id - Notification ID (optional, will be generated if not provided)
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} options - Additional notification options
 * @returns {Promise<string>} Notification ID
 */
export async function createChromeNotification(id, title, message, options = {}) {
  try {
    // Generate ID if not provided
    const notificationId = id || `mg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create notification
    return new Promise((resolve, reject) => {
      chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: options.icon || chrome.runtime.getURL('assets/icons/logo-icon-only.svg'),
        title,
        message,
        priority: options.priority || 0,
        requireInteraction: options.requireInteraction || false,
        ...options
      }, (createdId) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(createdId);
        }
      });
    });
  } catch (error) {
    return handleError('createChromeNotification', error, { 
      type: ErrorTypes.UNKNOWN,
      silent: true,
      returnValue: id || `mg-${Date.now()}`
    });
  }
}

/**
 * Show an in-app toast notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, info, warning, error)
 * @param {number} duration - Duration in milliseconds
 * @returns {HTMLElement} Toast element
 */
export function showToast(message, type = NotificationType.INFO, duration = 3000) {
  try {
    // Get or create container
    let container = document.querySelector('.mg-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'mg-toast-container';
      container.style.cssText = `
        position: fixed;
        top: 1rem;
        right: 1rem;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        max-width: 20rem;
      `;
      document.body.appendChild(container);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `mg-toast mg-toast-${type}`;
    toast.style.cssText = `
      padding: 0.75rem 1rem;
      border-radius: 0.375rem;
      background-color: var(--toast-bg-${type}, ${getBackgroundColor(type)});
      color: var(--toast-color-${type}, white);
      box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
      opacity: 0;
      transform: translateY(-0.5rem);
      transition: opacity 0.3s, transform 0.3s;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    `;
    
    // Add icon
    const icon = document.createElement('span');
    icon.innerHTML = getIconForType(type);
    icon.style.cssText = `
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    `;
    toast.appendChild(icon);
    
    // Add message
    const messageEl = document.createElement('span');
    messageEl.textContent = message;
    messageEl.style.cssText = `
      flex-grow: 1;
      font-size: 0.875rem;
    `;
    toast.appendChild(messageEl);
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
      background: transparent;
      border: none;
      color: inherit;
      font-size: 1.25rem;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      margin-left: 0.5rem;
      opacity: 0.7;
    `;
    closeBtn.onclick = () => {
      removeToast(toast);
    };
    toast.appendChild(closeBtn);
    
    // Add to container
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    }, 10);
    
    // Auto-remove after duration
    const timeoutId = setTimeout(() => {
      removeToast(toast);
    }, duration);
    
    toast._timeoutId = timeoutId;
    
    logger.debug(`Toast notification shown: ${type}`, { message });
    
    return toast;
  } catch (error) {
    logger.error('Error showing toast:', error);
    return null;
  }
}

/**
 * Remove a toast from the DOM
 * @param {HTMLElement} toast - Toast element to remove
 */
function removeToast(toast) {
  clearTimeout(toast._timeoutId);
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(-0.5rem)';
  
  setTimeout(() => {
    toast.remove();
    
    // Remove container if empty
    const container = document.querySelector('.mg-toast-container');
    if (container && !container.hasChildNodes()) {
      container.remove();
    }
  }, 300);
}

/**
 * Get background color for toast type
 * @param {string} type - Toast type
 * @returns {string} Background color
 */
function getBackgroundColor(type) {
  switch (type) {
    case NotificationType.SUCCESS: return 'rgba(25, 135, 84, 0.95)';
    case NotificationType.WARNING: return 'rgba(255, 193, 7, 0.95)';
    case NotificationType.ERROR: return 'rgba(220, 53, 69, 0.95)';
    case NotificationType.INFO:
    default: return 'rgba(13, 110, 253, 0.95)';
  }
}

/**
 * Get SVG icon for toast type
 * @param {string} type - Toast type
 * @returns {string} SVG icon markup
 */
function getIconForType(type) {
  switch (type) {
    case NotificationType.SUCCESS:
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
      </svg>`;
    case NotificationType.WARNING:
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
      </svg>`;
    case NotificationType.ERROR:
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
      </svg>`;
    case NotificationType.INFO:
    default:
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
      </svg>`;
  }
}

/**
 * Shorthand functions
 */
export const toast = {
  success: (message, duration) => showToast(message, NotificationType.SUCCESS, duration),
  info: (message, duration) => showToast(message, NotificationType.INFO, duration),
  warning: (message, duration) => showToast(message, NotificationType.WARNING, duration),
  error: (message, duration) => showToast(message, NotificationType.ERROR, duration)
};

/**
 * Add toast style sheet to document
 */
export function injectToastStyles() {
  try {
    if (document.getElementById('mg-toast-styles')) {
      return;
    }
    
    const styleSheet = document.createElement('style');
    styleSheet.id = 'mg-toast-styles';
    styleSheet.textContent = `
      .mg-toast-container {
        position: fixed;
        top: 1rem;
        right: 1rem;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        max-width: 20rem;
      }
      
      .mg-toast {
        padding: 0.75rem 1rem;
        border-radius: 0.375rem;
        box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
        opacity: 0;
        transform: translateY(-0.5rem);
        transition: opacity 0.3s, transform 0.3s;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: white;
      }
      
      .mg-toast-success {
        background-color: rgba(25, 135, 84, 0.95);
      }
      
      .mg-toast-info {
        background-color: rgba(13, 110, 253, 0.95);
      }
      
      .mg-toast-warning {
        background-color: rgba(255, 193, 7, 0.95);
      }
      
      .mg-toast-error {
        background-color: rgba(220, 53, 69, 0.95);
      }
    `;
    
    document.head.appendChild(styleSheet);
  } catch (error) {
    logger.error('Error injecting toast styles:', error);
  }
}

// Inject toast styles when this module is imported
if (typeof document !== 'undefined') {
  injectToastStyles();
}
