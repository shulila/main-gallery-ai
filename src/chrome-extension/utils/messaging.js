
/**
 * Messaging utilities for Chrome Extension
 * Improved version compatible with Service Workers
 */

import { logger } from './logger.js';

/**
 * Send a message to a tab with retry logic
 * @param {number} tabId - Tab ID to send message to
 * @param {any} message - Message to send
 * @param {object} options - Options for sending
 * @returns {Promise<any>} - Response from the tab
 */
export async function safeSendMessage(tabId, message, options = {}) {
  const { maxRetries = 1, retryDelay = 300 } = options;
  
  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // If not the first attempt, wait before retrying
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
      
      return await sendMessageToTab(tabId, message);
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
 * Ensure content script is loaded before trying to communicate
 * @param {object} tab - Tab object or tab ID
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
      const response = await sendMessageToTab(tabId, { action: 'CONTENT_SCRIPT_READY_CHECK' });
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
      const response = await sendMessageToTab(tabId, { action: 'CONTENT_SCRIPT_READY_CHECK' });
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
