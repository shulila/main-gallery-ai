
import { logger } from './logger.js';

/**
 * Send a message to a tab with retry capability
 * @param {number} tabId - The ID of the tab to send the message to
 * @param {Object} message - The message to send
 * @param {Object} [options] - Additional options
 * @param {number} [options.maxRetries=1] - Maximum number of retries
 * @param {number} [options.retryDelay=500] - Delay between retries in ms
 * @returns {Promise<any>} - Response from the tab
 */
export async function safeSendMessage(tabId, message, options = {}) {
  const { maxRetries = 1, retryDelay = 500 } = options;
  
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          const error = chrome.runtime.lastError;
          if (error) {
            logger.warn(`Send attempt ${attempt + 1}/${maxRetries + 1} failed:`, error.message);
            reject(new Error(error.message));
            return;
          }
          
          if (!response) {
            reject(new Error('No response received'));
            return;
          }
          
          resolve(response);
        });
      });
    } catch (error) {
      lastError = error;
      
      // Log retry attempts (except for the last one)
      if (attempt < maxRetries) {
        logger.warn(`Send attempt ${attempt + 1}/${maxRetries + 1} failed: ${error.message}`);
        logger.warn(`Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  // If we get here, all attempts failed
  throw lastError;
}

/**
 * Ensure the content script is loaded in a tab before trying to communicate with it
 * @param {Object} tab - Tab object or tab ID
 * @returns {Promise<boolean>} - Whether the content script is loaded
 */
export async function ensureContentScriptLoaded(tab) {
  const tabId = typeof tab === 'object' ? tab.id : tab;
  
  if (!tabId) {
    logger.error('No tab ID provided to ensureContentScriptLoaded');
    return false;
  }
  
  try {
    // First check if content script is already loaded
    const isLoaded = await checkContentScriptLoaded(tabId);
    if (isLoaded) {
      logger.log(`Content script already loaded in tab ${tabId}`);
      return true;
    }
    
    // If not loaded, inject the content script
    logger.log(`Injecting content script into tab ${tabId}`);
    
    // Inject the content script
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content-script.js']
    });
    
    // Verify it loaded properly
    return await checkContentScriptLoaded(tabId);
  } catch (error) {
    logger.error('Error ensuring content script is loaded:', error);
    return false;
  }
}

/**
 * Check if content script is loaded in a tab
 * @param {number} tabId - The ID of the tab to check
 * @returns {Promise<boolean>} - Whether the content script is loaded
 */
async function checkContentScriptLoaded(tabId) {
  try {
    return await new Promise((resolve) => {
      chrome.tabs.sendMessage(
        tabId, 
        { action: 'PING' }, 
        (response) => {
          const error = chrome.runtime.lastError;
          if (error) {
            logger.debug(`Content script not loaded in tab ${tabId}: ${error.message}`);
            resolve(false);
            return;
          }
          
          resolve(response && response.action === 'PONG');
        }
      );
      
      // Set a timeout in case the message never gets a response
      setTimeout(() => resolve(false), 300);
    });
  } catch (error) {
    logger.error('Error checking if content script is loaded:', error);
    return false;
  }
}
