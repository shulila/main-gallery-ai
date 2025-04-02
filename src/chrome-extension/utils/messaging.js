
/**
 * Chrome extension messaging utilities for MainGallery.AI
 */

import { logger } from './logger.js';
import { handleError } from './errorHandler.js';

/**
 * Safely send a message to a tab with retry logic
 * @param {number} tabId - Target tab ID
 * @param {Object} message - Message to send
 * @param {Function} [callback] - Optional callback
 * @param {number} [maxRetries=3] - Maximum number of retries
 * @returns {Promise<Object>} Promise resolving to the response
 */
export function safeSendMessage(tabId, message, callback, maxRetries = 3) {
  let retryCount = 0;
  
  return new Promise((resolve) => {
    function attemptSend() {
      try {
        // Check if tab exists first
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError) {
            logger.error('Tab does not exist:', chrome.runtime.lastError);
            const response = { success: false, error: 'Tab does not exist' };
            if (callback) callback(response);
            resolve(response);
            return;
          }
          
          // Tab exists, now try to send message
          chrome.tabs.sendMessage(tabId, message, (response) => {
            if (chrome.runtime.lastError) {
              logger.error('Error sending message:', chrome.runtime.lastError);
              
              if (retryCount < maxRetries) {
                logger.log(`Retry attempt ${retryCount + 1}/${maxRetries}...`);
                retryCount++;
                setTimeout(attemptSend, 500 * retryCount); // Exponential backoff
              } else {
                logger.error('Max retries reached, message could not be delivered');
                
                // If this is a scan request and failed, try to inject content script again
                if (message.action === 'startAutoScan' && retryCount >= maxRetries) {
                  logger.log('Trying to inject content script before final attempt');
                  
                  try {
                    chrome.scripting.executeScript({
                      target: { tabId: tabId },
                      files: ['content.js']
                    }).then(() => {
                      logger.log('Content script injected, waiting before final attempt');
                      setTimeout(() => {
                        chrome.tabs.sendMessage(tabId, message, (finalResponse) => {
                          if (chrome.runtime.lastError) {
                            logger.error('Final attempt failed:', chrome.runtime.lastError);
                            const response = { 
                              success: false, 
                              error: chrome.runtime.lastError.message,
                              injectionAttempted: true
                            };
                            if (callback) callback(response);
                            resolve(response);
                          } else {
                            const response = finalResponse || { success: true };
                            if (callback) callback(response);
                            resolve(response);
                          }
                        });
                      }, 1000);
                    }).catch(err => {
                      logger.error('Error injecting content script:', err);
                      const response = { success: false, error: 'Content script injection failed' };
                      if (callback) callback(response);
                      resolve(response);
                    });
                  } catch (err) {
                    logger.error('Error in injection logic:', err);
                    const response = { success: false, error: err.message };
                    if (callback) callback(response);
                    resolve(response);
                  }
                } else {
                  const response = { success: false, error: chrome.runtime.lastError.message };
                  if (callback) callback(response);
                  resolve(response);
                }
              }
            } else {
              const result = response || { success: true };
              if (callback) callback(result);
              resolve(result);
            }
          });
        });
      } catch (err) {
        handleError('safeSendMessage', err);
        const response = { success: false, error: err.message };
        if (callback) callback(response);
        resolve(response);
      }
    }
    
    attemptSend();
  });
}

/**
 * Ping a tab to check if content script is ready
 * @param {number} tabId - Tab ID to ping
 * @returns {Promise<boolean>} Promise resolving to whether content script is ready
 */
export function pingTab(tabId) {
  return new Promise((resolve) => {
    try {
      chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
        if (chrome.runtime.lastError) {
          logger.log('Content script not ready:', chrome.runtime.lastError);
          resolve(false);
        } else {
          logger.log('Content script is ready:', response);
          resolve(true);
        }
      });
    } catch (err) {
      handleError('pingTab', err, { silent: true });
      resolve(false);
    }
  });
}

/**
 * Ensure content script is loaded in a tab
 * @param {Object} tab - Tab object
 * @returns {Promise<boolean>} Promise resolving to whether content script is now ready
 */
export async function ensureContentScriptLoaded(tab) {
  if (!tab || !tab.id) {
    logger.error('Invalid tab');
    return false;
  }
  
  // First try pinging to see if content script is already loaded
  const isReady = await pingTab(tab.id);
  if (isReady) {
    return true;
  }
  
  // Content script not loaded, inject it
  logger.log('Content script not ready, injecting...');
  
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    
    logger.log('Content script injected, waiting for initialization');
    
    // Give it time to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if it's ready now
    return await pingTab(tab.id);
  } catch (err) {
    handleError('ensureContentScriptLoaded', err);
    return false;
  }
}
