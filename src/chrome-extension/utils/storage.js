
/**
 * Storage utility for MainGallery.AI Chrome Extension
 */

// Storage keys
export const STORAGE_KEYS = {
  SESSION: 'mg_session',
  USER: 'mg_user',
  AUTH_STATE: 'mg_auth_state',
  AUTH_IN_PROGRESS: 'mg_auth_in_progress',
  LAST_SYNC: 'mg_last_sync',
  SETTINGS: 'mg_settings'
};

// Storage utility
export const storage = {
  /**
   * Get item from storage
   * @param {string} key - Storage key
   * @returns {Promise<any>} Stored value or null
   */
  get: async function(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        const value = result[key] !== undefined ? result[key] : null;
        resolve(value);
      });
    });
  },
  
  /**
   * Set item in storage
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   * @returns {Promise<boolean>} Success status
   */
  set: async function(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve(true);
      });
    });
  },
  
  /**
   * Remove item from storage
   * @param {string} key - Storage key
   * @returns {Promise<boolean>} Success status
   */
  remove: async function(key) {
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, () => {
        resolve(true);
      });
    });
  },
  
  /**
   * Clear all storage
   * @returns {Promise<boolean>} Success status
   */
  clear: async function() {
    return new Promise((resolve) => {
      chrome.storage.local.clear(() => {
        resolve(true);
      });
    });
  }
};
