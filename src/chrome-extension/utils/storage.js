
/**
 * Storage utility for MainGallery.AI Chrome Extension
 */

import { logger } from './logger.js';

export const STORAGE_KEYS = {
  USER: 'main_gallery_user',
  SESSION: 'main_gallery_session',
  AUTH_STATE: 'main_gallery_auth_state',
  SETTINGS: 'main_gallery_settings',
  PLATFORMS: 'main_gallery_platforms',
  LAST_SYNC: 'main_gallery_last_sync',
  SYNC_IN_PROGRESS: 'main_gallery_sync_in_progress'
};

export const storage = {
  /**
   * Get a value from storage
   * @param {string} key - Storage key
   * @param {any} defaultValue - Default value if key not found
   * @returns {Promise<any>} The value or default value if not found
   */
  get: async function(key, defaultValue) {
    try {
      // Using Promise-based wrapper around the callback API
      const result = await new Promise((resolve, reject) => {
        chrome.storage.local.get([key], (items) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(items);
          }
        });
      });
      return result[key] !== undefined ? result[key] : (defaultValue ?? null);
    } catch (error) {
      logger.error(`Error getting ${key} from storage:`, error);
      return defaultValue ?? null;
    }
  },
  
  /**
   * Set a value in storage
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   * @returns {Promise<boolean>} Success status
   */
  set: async function(key, value) {
    try {
      await new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
      return true;
    } catch (error) {
      logger.error(`Error setting ${key} in storage:`, error);
      return false;
    }
  },
  
  /**
   * Remove a value from storage
   * @param {string} key - Storage key
   * @returns {Promise<boolean>} Success status
   */
  remove: async function(key) {
    try {
      await new Promise((resolve, reject) => {
        chrome.storage.local.remove(key, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
      return true;
    } catch (error) {
      logger.error(`Error removing ${key} from storage:`, error);
      return false;
    }
  },
  
  /**
   * Clear all storage
   * @returns {Promise<boolean>} Success status
   */
  clear: async function() {
    try {
      await new Promise((resolve, reject) => {
        chrome.storage.local.clear(() => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
      return true;
    } catch (error) {
      logger.error('Error clearing storage:', error);
      return false;
    }
  },
  
  /**
   * Get all items from storage
   * @returns {Promise<Object>} All storage items
   */
  getAll: async function() {
    try {
      return await new Promise((resolve, reject) => {
        chrome.storage.local.get(null, (items) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(items);
          }
        });
      });
    } catch (error) {
      logger.error('Error getting all storage data:', error);
      return {};
    }
  },
  
  /**
   * Get multiple items from storage
   * @param {Array<string>} keys - Keys to retrieve
   * @returns {Promise<Object>} Object with key-value pairs
   */
  getItems: async function(keys) {
    try {
      return await new Promise((resolve, reject) => {
        chrome.storage.local.get(keys, (items) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(items);
          }
        });
      });
    } catch (error) {
      logger.error('Error getting multiple storage items:', error);
      return {};
    }
  }
};

