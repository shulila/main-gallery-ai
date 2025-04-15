
/**
 * Messaging utility for MainGallery.AI Chrome Extension
 */

import { logger } from './logger.js';
import { storage, STORAGE_KEYS } from './storage.js';
import { CONFIG } from './config.js';

/**
 * Sync authentication state between extension and web app
 * @returns {Promise<boolean>} Success status
 */
export async function syncAuthState() {
  try {
    logger.log('Syncing auth state');
    
    // Get current session
    const session = await storage.get(STORAGE_KEYS.SESSION);
    
    // If no session, nothing to sync
    if (!session) {
      logger.log('No session to sync');
      return false;
    }
    
    // Check if session is valid
    if (!session.access_token || !session.user) {
      logger.warn('Invalid session, removing');
      await storage.remove(STORAGE_KEYS.SESSION);
      await storage.remove(STORAGE_KEYS.USER);
      return false;
    }
    
    // Check if token has expired
    if (session.expires_at && Date.now() >= session.expires_at) {
      logger.warn('Session expired, removing');
      await storage.remove(STORAGE_KEYS.SESSION);
      await storage.remove(STORAGE_KEYS.USER);
      return false;
    }
    
    // Update last sync timestamp
    await storage.set(STORAGE_KEYS.LAST_SYNC, Date.now());
    
    logger.log('Auth state synced successfully');
    return true;
  } catch (error) {
    logger.error('Error syncing auth state:', error);
    return false;
  }
}

/**
 * Send message to content script
 * @param {number} tabId - Tab ID
 * @param {Object} message - Message to send
 * @returns {Promise<any>} Response from content script
 */
export async function sendMessageToContentScript(tabId, message) {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Send message to background script
 * @param {Object} message - Message to send
 * @returns {Promise<any>} Response from background script
 */
export async function sendMessageToBackground(message) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}
