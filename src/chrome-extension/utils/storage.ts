
import { logger } from './logger.js';

export const STORAGE_KEYS = {
  SESSION: 'mg_session',
  USER: 'mg_user',
  AUTH_STATE: 'mg_auth_state',
  LAST_SYNC: 'mg_last_sync',
  SYNC_IN_PROGRESS: 'mg_sync_in_progress'
} as const;

export const storage = {
  get: async <T = any>(key: string, defaultValue?: T): Promise<T | null> => {
    try {
      // The chrome.storage.local.get method expects a callback as second argument
      // We need to wrap it in a Promise to use await
      const result = await new Promise<Record<string, any>>((resolve, reject) => {
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
      logger.error('Storage get error:', error);
      return defaultValue ?? null;
    }
  },

  set: async <T>(key: string, value: T): Promise<boolean> => {
    try {
      await new Promise<void>((resolve, reject) => {
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
      logger.error('Storage set error:', error);
      return false;
    }
  },

  remove: async (key: string): Promise<boolean> => {
    try {
      await new Promise<void>((resolve, reject) => {
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
      logger.error('Storage remove error:', error);
      return false;
    }
  },

  clear: async (): Promise<boolean> => {
    try {
      await new Promise<void>((resolve, reject) => {
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
      logger.error('Storage clear error:', error);
      return false;
    }
  }
};
