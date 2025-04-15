
import { logger } from './logger.js';

export const STORAGE_KEYS = {
  SESSION: 'mg_session',
  USER: 'mg_user',
  AUTH_STATE: 'mg_auth_state',
  LAST_SYNC: 'mg_last_sync',
  SYNC_IN_PROGRESS: 'mg_sync_in_progress'
} as const;

export const storage = {
  /**
   * Get a value from storage
   * @param key Storage key
   * @param defaultValue Default value if key not found
   * @returns The value or default value if not found
   */
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

  /**
   * Set a value in storage
   * @param key Storage key
   * @param value Value to store
   * @returns Success status
   */
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

  /**
   * Remove a value from storage
   * @param key Storage key
   * @returns Success status
   */
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

  /**
   * Clear all storage
   * @returns Success status
   */
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
  },

  /**
   * Get multiple items from storage
   * @param keys Array of keys to retrieve
   * @returns Object with key-value pairs
   */
  getItems: async <T = any>(keys: string[]): Promise<Record<string, T>> => {
    try {
      const result = await new Promise<Record<string, any>>((resolve, reject) => {
        chrome.storage.local.get(keys, (items) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(items);
          }
        });
      });
      return result as Record<string, T>;
    } catch (error) {
      logger.error('Storage getItems error:', error);
      return {} as Record<string, T>;
    }
  }
};

