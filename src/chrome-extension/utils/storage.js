
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
  get: async (key) => {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key];
    } catch (error) {
      logger.error(`Error getting ${key} from storage:`, error);
      return null;
    }
  },
  
  set: async (key, value) => {
    try {
      await chrome.storage.local.set({ [key]: value });
      return true;
    } catch (error) {
      logger.error(`Error setting ${key} in storage:`, error);
      return false;
    }
  },
  
  remove: async (key) => {
    try {
      await chrome.storage.local.remove(key);
      return true;
    } catch (error) {
      logger.error(`Error removing ${key} from storage:`, error);
      return false;
    }
  },
  
  clear: async () => {
    try {
      await chrome.storage.local.clear();
      return true;
    } catch (error) {
      logger.error('Error clearing storage:', error);
      return false;
    }
  },
  
  getAll: async () => {
    try {
      return await chrome.storage.local.get(null);
    } catch (error) {
      logger.error('Error getting all storage data:', error);
      return {};
    }
  }
};

logger.log('Storage utility initialized');
