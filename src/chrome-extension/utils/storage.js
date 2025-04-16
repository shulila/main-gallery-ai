
import { logger } from './logger.js';

// מפתחות לאחסון נתונים
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER: 'user',
  SETTINGS: 'settings'
};

// מעטפת לאחסון Chrome
export const storage = {
  /**
   * שמירת נתונים באחסון
   * @param {string} key - מפתח
   * @param {any} value - ערך
   * @returns {Promise<void>}
   */
  async set(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
      return true;
    } catch (error) {
      logger.error(`Error setting storage key ${key}:`, error);
      return false;
    }
  },
  
  /**
   * קבלת נתונים מהאחסון
   * @param {string} key - מפתח
   * @returns {Promise<any>} ערך
   */
  async get(key) {
    try {
      const result = await chrome.storage.local.get([key]);
      return result[key];
    } catch (error) {
      logger.error(`Error getting storage key ${key}:`, error);
      return null;
    }
  },
  
  /**
   * הסרת נתונים מהאחסון
   * @param {string} key - מפתח
   * @returns {Promise<boolean>} הצלחה/כישלון
   */
  async remove(key) {
    try {
      await chrome.storage.local.remove([key]);
      return true;
    } catch (error) {
      logger.error(`Error removing storage key ${key}:`, error);
      return false;
    }
  },
  
  /**
   * ניקוי כל האחסון
   * @returns {Promise<boolean>} הצלחה/כישלון
   */
  async clear() {
    try {
      await chrome.storage.local.clear();
      return true;
    } catch (error) {
      logger.error('Error clearing storage:', error);
      return false;
    }
  }
};
