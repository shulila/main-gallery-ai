
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
  }
};

logger.log('Storage utility initialized');
