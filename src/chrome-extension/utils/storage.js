
/**
 * Storage utilities for MainGallery.AI Chrome Extension
 * Enhanced wrapper for Chrome storage API with type safety and error handling
 */

import { logger } from './logger.js';
import { handleError, ErrorTypes } from './error-handler.js';

/**
 * Storage keys used by the extension
 */
export const STORAGE_KEYS = {
  // Authentication
  SESSION: 'mg_session',
  USER: 'mg_user',
  AUTH_STATE: 'mg_auth_state',
  AUTH_NONCE: 'mg_auth_nonce',
  
  // Settings
  SETTINGS: 'mg_settings',
  SCAN_HISTORY: 'mg_scan_history',
  
  // App state
  LAST_SYNC: 'mg_last_sync',
  SYNC_IN_PROGRESS: 'mg_sync_in_progress',
  
  // Cache
  IMAGE_CACHE: 'mg_image_cache',
  
  // Logs
  ERROR_LOGS: 'mg_error_logs'
};

/**
 * Enhanced storage wrapper
 */
export const storage = {
  /**
   * Get a value from storage
   * @template T
   * @param {string} key - Storage key
   * @param {T} [defaultValue] - Default value if key not found
   * @returns {Promise<T|null>} The value or default value if not found
   */
  get: async function(key, defaultValue = null) {
    try {
      // The chrome.storage.local.get method expects an object or array as first parameter
      // and a callback function as the second parameter
      return new Promise((resolve, reject) => {
        chrome.storage.local.get(key, (result) => {
          if (chrome.runtime.lastError) {
            logger.error(`Storage get error for key '${key}':`, chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            const value = typeof key === 'string' ? result[key] : result;
            resolve(value !== undefined ? value : defaultValue);
          }
        });
      });
    } catch (error) {
      return handleError(`storage.get(${key})`, error, {
        type: ErrorTypes.STORAGE,
        silent: true,
        returnValue: defaultValue
      }).value;
    }
  },

  /**
   * Set a value in storage
   * @template T
   * @param {string} key - Storage key
   * @param {T} value - Value to store
   * @returns {Promise<boolean>} Success status
   */
  set: async function(key, value) {
    try {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime.lastError) {
            logger.error(`Storage set error for key '${key}':`, chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            resolve(true);
          }
        });
      });
    } catch (error) {
      return handleError(`storage.set(${key})`, error, {
        type: ErrorTypes.STORAGE,
        silent: true,
        returnValue: false
      }).value;
    }
  },

  /**
   * Remove a value from storage
   * @param {string|string[]} keys - Storage key(s) to remove
   * @returns {Promise<boolean>} Success status
   */
  remove: async function(keys) {
    try {
      return new Promise((resolve, reject) => {
        chrome.storage.local.remove(keys, () => {
          if (chrome.runtime.lastError) {
            logger.error(`Storage remove error for key(s) '${keys}':`, chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            resolve(true);
          }
        });
      });
    } catch (error) {
      return handleError(`storage.remove(${Array.isArray(keys) ? keys.join(',') : keys})`, error, {
        type: ErrorTypes.STORAGE,
        silent: true,
        returnValue: false
      }).value;
    }
  },

  /**
   * Clear all storage
   * @returns {Promise<boolean>} Success status
   */
  clear: async function() {
    try {
      return new Promise((resolve, reject) => {
        chrome.storage.local.clear(() => {
          if (chrome.runtime.lastError) {
            logger.error('Storage clear error:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            resolve(true);
          }
        });
      });
    } catch (error) {
      return handleError('storage.clear()', error, {
        type: ErrorTypes.STORAGE,
        silent: true,
        returnValue: false
      }).value;
    }
  },

  /**
   * Get multiple items from storage
   * @template T
   * @param {string[]} keys - Array of keys to retrieve
   * @returns {Promise<Record<string, T>>} Object with key-value pairs
   */
  getMultiple: async function(keys) {
    try {
      return new Promise((resolve, reject) => {
        chrome.storage.local.get(keys, (items) => {
          if (chrome.runtime.lastError) {
            logger.error(`Storage getMultiple error for keys '${keys.join(', ')}':`, chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            resolve(items);
          }
        });
      });
    } catch (error) {
      return handleError(`storage.getMultiple(${keys.join(', ')})`, error, {
        type: ErrorTypes.STORAGE,
        silent: true,
        returnValue: {}
      }).value;
    }
  },

  /**
   * Set multiple items in storage
   * @param {Record<string, any>} items - Object with key-value pairs to store
   * @returns {Promise<boolean>} Success status
   */
  setMultiple: async function(items) {
    try {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set(items, () => {
          if (chrome.runtime.lastError) {
            logger.error('Storage setMultiple error:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            resolve(true);
          }
        });
      });
    } catch (error) {
      return handleError('storage.setMultiple()', error, {
        type: ErrorTypes.STORAGE,
        silent: true,
        returnValue: false
      }).value;
    }
  },

  /**
   * Get secure storage (encrypts/decrypts sensitive data)
   * @param {string} key - Storage key
   * @returns {Promise<any>} Decrypted value
   */
  getSecure: async function(key) {
    // For simplicity, just use regular storage for now
    // In a real implementation, this would use encryption
    return this.get(key);
  },

  /**
   * Set secure storage (encrypts/decrypts sensitive data)
   * @param {string} key - Storage key
   * @param {any} value - Value to encrypt and store
   * @returns {Promise<boolean>} Success status
   */
  setSecure: async function(key, value) {
    // For simplicity, just use regular storage for now
    // In a real implementation, this would use encryption
    return this.set(key, value);
  }
};

// Export default for compatibility
export default storage;
