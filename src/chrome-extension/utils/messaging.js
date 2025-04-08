
/**
 * Message handling utilities for extension communication
 */
import { logger } from './logger.js';
import { handleError, withRetry } from './errorHandler.js';

/**
 * Check if tab is ready for messaging
 * @param {number} tabId - Chrome tab ID
 * @returns {Promise<boolean>} Whether tab is ready
 */
async function isTabReadyForMessaging(tabId) {
  try {
    return new Promise((resolve) => {
      chrome.tabs.get(tabId, (tab) => {
        const error = chrome.runtime.lastError;
        if (error) {
          logger.warn(`Tab ${tabId} not ready: ${error.message}`);
          resolve(false);
          return;
        }
        
        if (!tab || tab.status !== 'complete') {
          logger.warn(`Tab ${tabId} not in complete state: ${tab?.status || 'unknown'}`);
          resolve(false);
          return;
        }
        
        resolve(true);
      });
    });
  } catch (error) {
    handleError('isTabReadyForMessaging', error, { silent: true });
    return false;
  }
}

/**
 * Verify tab exists before attempting messaging
 * @param {number} tabId - Chrome tab ID
 * @returns {Promise<boolean>} Whether tab exists
 */
async function doesTabExist(tabId) {
  if (!tabId || typeof tabId !== 'number') {
    return false;
  }
  
  try {
    return new Promise((resolve) => {
      chrome.tabs.get(tabId, (tab) => {
        const error = chrome.runtime.lastError;
        if (error) {
          logger.warn(`Tab ${tabId} does not exist: ${error.message}`);
          resolve(false);
          return;
        }
        resolve(true);
      });
    });
  } catch (error) {
    handleError('doesTabExist', error, { silent: true });
    return false;
  }
}

/**
 * Send a message to a tab with retry support and error handling
 * @param {number} tabId - ID of tab to send message to
 * @param {object} message - Message data to send
 * @param {object} options - Options for sending
 * @returns {Promise} Response from tab
 */
export async function safeSendMessage(tabId, message, options = {}) {
  const { maxRetries = 1, retryDelay = 300 } = options;
  
  // First verify tab exists
  const tabExists = await doesTabExist(tabId);
  if (!tabExists) {
    logger.warn(`Cannot send message to non-existent tab ${tabId}`);
    return { success: false, error: `Tab ${tabId} does not exist` };
  }
  
  // Then check if tab is ready
  const isReady = await isTabReadyForMessaging(tabId);
  if (!isReady) {
    logger.warn(`Tab ${tabId} is not ready for messaging`);
    return { success: false, error: `Tab ${tabId} is not ready for messaging` };
  }
  
  // Use retry mechanism
  try {
    return await withRetry(
      async () => {
        return new Promise((resolve, reject) => {
          try {
            chrome.tabs.sendMessage(tabId, message, (response) => {
              // Check for runtime error
              const error = chrome.runtime.lastError;
              if (error) {
                // More detailed error logging
                logger.error(`Error sending message to tab ${tabId}: ${error.message}`, {
                  tabId,
                  message: JSON.stringify(message).substring(0, 100) + '...',
                  errorDetails: error
                });
                reject(new Error(`Error sending message to tab ${tabId}: ${error.message}`));
                return;
              }
              
              // Resolve with response
              resolve(response || { success: true });
            });
          } catch (err) {
            reject(err);
          }
        });
      },
      { 
        maxRetries, 
        baseDelay: retryDelay, 
        source: `sendMessage(${tabId})`
      }
    );
  } catch (error) {
    // Handle the error and return a graceful failure response
    handleError('safeSendMessage', error);
    return { 
      success: false, 
      error: error.message || 'Failed to send message to tab',
      context: {
        tabId,
        messageType: message?.action || 'unknown',
        timestamp: Date.now()
      }
    };
  }
}

/**
 * Ensure content script is loaded in a tab
 * @param {object} tab - Tab object
 * @returns {Promise<boolean>} Whether content script is loaded
 */
export async function ensureContentScriptLoaded(tab) {
  if (!tab || !tab.id) {
    logger.error('Invalid tab passed to ensureContentScriptLoaded');
    return false;
  }
  
  try {
    // First verify tab exists
    const tabExists = await doesTabExist(tab.id);
    if (!tabExists) {
      logger.warn(`Cannot inject content script into non-existent tab ${tab.id}`);
      return false;
    }
    
    // Next check if tab is ready for messaging
    const tabIsReady = await isTabReadyForMessaging(tab.id);
    if (!tabIsReady) {
      logger.warn(`Tab ${tab.id} not ready for content script injection`);
      return false;
    }
    
    // Try to ping content script
    try {
      const response = await new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (response) => {
          const error = chrome.runtime.lastError;
          if (error) {
            logger.log(`Content script not loaded in tab ${tab.id}: ${error.message}`);
            resolve(null);
            return;
          }
          resolve(response);
        });
      });
      
      // If we get a pong response, content script is already loaded
      if (response && response.action === 'pong') {
        logger.log('Content script already loaded in tab', tab.id);
        return true;
      }
    } catch (e) {
      // Ignore errors here - just means content script isn't loaded
      logger.log('Error checking for content script, will try to inject:', e.message);
    }
    
    // Inject content script
    logger.log('Injecting content script into tab', tab.id);
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      
      // Wait a bit to ensure content script initializes
      await new Promise(resolve => setTimeout(resolve, 500)); // Increased from 300ms to 500ms
      
      // Verify content script was loaded by sending a ping
      try {
        const response = await new Promise((resolve) => {
          chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (response) => {
            const error = chrome.runtime.lastError;
            if (error) {
              logger.warn(`Content script still not responsive after injection: ${error.message}`);
              resolve(null);
              return;
            }
            resolve(response);
          });
        });
        
        if (response && response.action === 'pong') {
          logger.log('Content script successfully injected and responsive');
          return true;
        } else {
          logger.warn('Content script injected but not responsive');
          return false;
        }
      } catch (e) {
        handleError('verifyContentScriptInjection', e, { silent: true });
        return false;
      }
    } catch (injectionError) {
      logger.error('Failed to inject content script:', injectionError.message);
      return false;
    }
  } catch (error) {
    handleError('ensureContentScriptLoaded', error);
    return false;
  }
}
