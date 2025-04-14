
import { logger } from './logger.js';

export const STORAGE_KEYS = {
  SESSION: 'mg_session',
  USER: 'mg_user',
  AUTH_STATE: 'mg_auth_state',
  LAST_SYNC: 'mg_last_sync'
} as const;

export const storage = {
  get: async <T = any>(key: string, defaultValue?: T): Promise<T | null> => {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] !== undefined ? result[key] : (defaultValue ?? null);
    } catch (error) {
      logger.error('Storage get error:', error);
      return defaultValue ?? null;
    }
  },

  set: async <T>(key: string, value: T): Promise<boolean> => {
    try {
      await chrome.storage.local.set({ [key]: value });
      return true;
    } catch (error) {
      logger.error('Storage set error:', error);
      return false;
    }
  },

  remove: async (key: string): Promise<boolean> => {
    try {
      await chrome.storage.local.remove(key);
      return true;
    } catch (error) {
      logger.error('Storage remove error:', error);
      return false;
    }
  },

  clear: async (): Promise<boolean> => {
    try {
      await chrome.storage.local.clear();
      return true;
    } catch (error) {
      logger.error('Storage clear error:', error);
      return false;
    }
  }
};
