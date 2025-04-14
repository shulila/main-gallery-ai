
/**
 * Storage utility for MainGallery.AI Chrome Extension
 * Handles secure storage operations in Chrome extensions
 */

import { logger } from './logger.js';

// Storage keys
export const STORAGE_KEYS = {
  SESSION: 'mg_session',
  USER: 'mg_user',
  AUTH_STATE: 'mg_auth_state',
  AUTH_ERROR: 'mg_auth_error',
  LAST_AUTH_ATTEMPT: 'mg_last_auth_attempt',
  AUTH_EVENT: 'mg_auth_event'
};

// Storage utility
export const storage = {
  // Get item from storage
  get: async function(key) {
    try {
      const result = await chrome.storage.local.get([key]);
      return result[key] || null;
    } catch (error) {
      logger.error(`Error getting item from storage: ${key}`, error);
      return null;
    }
  },
  
  // Set item in storage
  set: async function(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
      return true;
    } catch (error) {
      logger.error(`Error setting item in storage: ${key}`, error);
      return false;
    }
  },
  
  // Remove item from storage
  remove: async function(key) {
    try {
      await chrome.storage.local.remove([key]);
      return true;
    } catch (error) {
      logger.error(`Error removing item from storage: ${key}`, error);
      return false;
    }
  },
  
  // Clear all storage
  clear: async function() {
    try {
      await chrome.storage.local.clear();
      return true;
    } catch (error) {
      logger.error('Error clearing storage', error);
      return false;
    }
  },
  
  // Get multiple items from storage
  getMultiple: async function(keys) {
    try {
      return await chrome.storage.local.get(keys);
    } catch (error) {
      logger.error(`Error getting multiple items from storage`, error);
      return {};
    }
  }
};

// Export storage utility
export default storage;
