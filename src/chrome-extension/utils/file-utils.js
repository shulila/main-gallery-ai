
import { logger } from './logger.js';

/**
 * בדיקת נגישות קובץ
 * @param {string} url - כתובת הקובץ
 * @returns {Promise<boolean>} האם הקובץ נגיש
 */
export async function checkFileAccessibility(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    logger.error(`Error checking file accessibility for ${url}:`, error);
    return false;
  }
}

/**
 * בדיקת נגישות קבצי אייקונים
 * @returns {Promise<Object>} תוצאות הבדיקה
 */
export async function verifyIconsAccessibility() {
  const iconPaths = [
    'assets/icons/icon16.png',
    'assets/icons/icon32.png',
    'assets/icons/icon48.png',
    'assets/icons/icon128.png',
    'assets/icons/logo-icon-only.svg',
    'assets/icons/google-icon.svg',
    'icons/icon16.png',
    'icons/icon32.png',
    'icons/icon48.png',
    'icons/icon128.png',
    'icons/logo-icon-only.svg',
    'icons/google-icon.svg'
  ];
  
  const results = {};
  
  for (const path of iconPaths) {
    try {
      results[path] = await checkFileAccessibility(chrome.runtime.getURL(path));
    } catch (error) {
      logger.error(`Error checking accessibility for ${path}:`, error);
      results[path] = false;
    }
  }
  
  logger.log('Icons accessibility check results:', results);
  return results;
}
