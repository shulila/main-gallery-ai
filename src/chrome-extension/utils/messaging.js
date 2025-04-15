/**
 * Messaging utilities for Chrome Extension
 * Improved version compatible with Service Workers
 */

import { logger } from './logger.js';
import { handleError, withTimeout } from './errorHandler.js';

// Message types
export const MessageTypes = {
  AUTH: {
    LOGIN: 'auth:login',
    LOGOUT: 'auth:logout',
    CHECK: 'auth:check',
    TOKEN: 'auth:token'
  },
  GALLERY: {
    OPEN: 'gallery:open',
    ADD_IMAGE: 'gallery:add_image',
    GET_IMAGES: 'gallery:get_images'
  },
  CONTENT: {
    READY_CHECK: 'content:ready_check',
    START_SCAN: 'content:start_scan',
    SCAN_COMPLETE: 'content:scan_complete'
  }
};

/**
 * Send a message to a tab with retry logic
 * @param {number} tabId - Tab ID to send message to
 * @param {any} message - Message to send
 * @param {object} options - Options for sending
 * @returns {Promise<any>} - Response from the tab
 */
export async function safeSendMessage(tabId, message, options = {}) {
  const { maxRetries = 1, retryDelay = 300, timeout = 5000 } = options;
  
  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // If not the first attempt, wait before retrying
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
      
      // Use the timeout wrapper for the send message operation
      return await withTimeout(
        async () => sendMessageToTab(tabId, message),
        timeout,
        `Message to tab ${tabId} timed out after ${timeout}ms`
      )();
    } catch (error) {
      lastError = error;
      logger.warn(`Message send attempt ${attempt + 1}/${maxRetries + 1} failed:`, error);
      
      // If this is the last attempt, don't continue
      if (attempt === maxRetries) {
        break;
      }
    }
  }
  
  throw lastError;
}

/**
 * Send a message to a tab
 * @param {number} tabId - Tab ID to send message to
 * @param {any} message - Message to send
 * @returns {Promise<any>} - Response from the tab
 */
function sendMessageToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        const error = chrome.runtime.lastError;
        
        if (error) {
          reject(new Error(`Error sending message to tab ${tabId}: ${error.message}`));
          return;
        }
        
        if (response === undefined) {
          reject(new Error(`No response from tab ${tabId}`));
          return;
        }
        
        resolve(response);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Send a message to the background script
 * @param {object} message - Message to send
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<any>} - Response from the background script
 */
export async function sendRuntimeMessage(message, timeout = 5000) {
  return withTimeout(
    async () => {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
          const error = chrome.runtime.lastError;
          
          if (error) {
            reject(new Error(`Error sending runtime message: ${error.message}`));
            return;
          }
          
          if (response === undefined) {
            reject(new Error('No response received from runtime message'));
            return;
          }
          
          resolve(response);
        });
      });
    },
    timeout,
    `Runtime message timed out after ${timeout}ms`
  )();
}

/**
 * Ensure content script is loaded before trying to communicate
 * @param {object|number} tab - Tab object or tab ID
 * @returns {Promise<boolean>} - Whether the content script is loaded
 */
export async function ensureContentScriptLoaded(tab) {
  try {
    const tabId = typeof tab === 'object' ? tab.id : tab;
    
    if (!tabId) {
      logger.error('No tab ID provided to ensureContentScriptLoaded');
      return false;
    }
    
    // Try to check if content script is already loaded
    try {
      const response = await sendMessageToTab(tabId, { 
        type: MessageTypes.CONTENT.READY_CHECK 
      });
      
      if (response && response.ready) {
        logger.log(`Content script already loaded in tab ${tabId}`);
        return true;
      }
    } catch (error) {
      // Content script is not loaded or not responding, continue to injection
      logger.log(`Content script not responding in tab ${tabId}, will inject`);
    }
    
    // Inject the content script
    logger.log(`Injecting content script into tab ${tabId}`);
    
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      
      // Wait a little to make sure the script initializes
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verify it was loaded correctly
      const response = await sendMessageToTab(tabId, { 
        type: MessageTypes.CONTENT.READY_CHECK
      });
      
      return response && response.ready;
    } catch (injectError) {
      logger.error(`Failed to inject content script into tab ${tabId}:`, injectError);
      return false;
    }
  } catch (error) {
    logger.error('Error in ensureContentScriptLoaded:', error);
    return false;
  }
}

/**
 * Create a message handler for background script
 * @param {Object} handlers - Map of message types to handler functions
 * @returns {Function} Message listener function
 */
export function createMessageHandler(handlers) {
  return (message, sender, sendResponse) => {
    const type = message.type || message.action;
    
    logger.log(`Received message: ${type}`);
    
    // Check if handler exists for this message type
    if (!handlers[type]) {
      logger.warn(`No handler for message type: ${type}`);
      sendResponse({ 
        success: false, 
        error: `Unknown message type: ${type}` 
      });
      return false; // Don't keep channel open
    }
    
    // Execute handler and handle promise or direct result
    try {
      const result = handlers[type](message, sender);
      
      if (result instanceof Promise) {
        // For async handlers, keep the message channel open
        result
          .then(response => {
            sendResponse(response || { success: true });
          })
          .catch(error => {
            const errorResponse = handleError(type, error);
            sendResponse(errorResponse);
          });
        
        return true; // Keep channel open for async response
      } else {
        // For synchronous handlers, send response immediately
        sendResponse(result || { success: true });
        return false; // Don't keep channel open
      }
    } catch (error) {
      // Handle synchronous errors
      const errorResponse = handleError(type, error);
      sendResponse(errorResponse);
      return false; // Don't keep channel open
    }
  };
}
