
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
  LAST_SYNC: 'main_gallery_last_sync'
};

export const storage = {
  get: async function(key, defaultValue) {
    try {
      // Using Promise-based wrapper around the callback API
      const result = await new Promise((resolve) => {
        chrome.storage.local.get([key], (items) => {
          resolve(items);
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
      await new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, () => {
          resolve();
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
      await new Promise((resolve) => {
        chrome.storage.local.remove(key, () => {
          resolve();
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
      await new Promise((resolve) => {
        chrome.storage.local.clear(() => {
          resolve();
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
      return await new Promise((resolve) => {
        chrome.storage.local.get(null, (items) => {
          resolve(items);
        });
      });
    } catch (error) {
      logger.error('Error getting all storage data:', error);
      return {};
    }
  }
};

logger.log('Storage utility initialized');
