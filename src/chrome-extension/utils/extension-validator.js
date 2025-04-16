
import { logger } from './logger.js';
import { preloadCriticalImages } from './image-handler.js';
import { validateClientId } from './auth/client-validator.js';

/**
 * בדיקת תקינות הרחבה
 * @returns {Promise<Object>} תוצאות הבדיקה
 */
export async function validateExtension() {
  const results = {
    manifest: false,
    oauth: false,
    icons: false,
    auth: false,
    storage: false,
    overall: false
  };
  
  try {
    // בדיקת manifest
    try {
      const manifest = chrome.runtime.getManifest();
      results.manifest = !!manifest && 
                        !!manifest.name && 
                        !!manifest.version && 
                        !!manifest.action && 
                        !!manifest.background;
      
      // בדיקת הגדרות OAuth
      if (manifest && manifest.oauth2) {
        const clientId = manifest.oauth2.client_id;
        results.oauth = validateClientId(clientId);
      }
    } catch (error) {
      logger.error('Error validating manifest:', error);
      results.manifest = false;
      results.oauth = false;
    }
    
    // בדיקת אייקונים
    results.icons = await preloadCriticalImages();
    
    // בדיקת אחסון
    try {
      const testKey = 'mg_extension_validation_test';
      await chrome.storage.local.set({ [testKey]: true });
      const testResult = await chrome.storage.local.get([testKey]);
      results.storage = testResult[testKey] === true;
      await chrome.storage.local.remove([testKey]);
    } catch (error) {
      logger.error('Error validating storage:', error);
      results.storage = false;
    }
    
    // הערכה כללית
    results.overall = results.manifest && results.oauth && results.icons && results.storage;
    
    logger.log('Extension validation results:', results);
    return results;
  } catch (error) {
    logger.error('Error validating extension:', error);
    results.overall = false;
    return results;
  }
}

/**
 * הצגת אזהרות או שגיאות אם התוסף אינו תקין
 * @param {Object} results - תוצאות בדיקת התקינות
 */
export function showValidationWarnings(results) {
  if (!results.overall) {
    const warningElement = document.createElement('div');
    warningElement.className = 'critical-error';
    
    let warningMessage = 'Extension validation failed:';
    
    if (!results.manifest) {
      warningMessage += ' Manifest issues detected.';
    }
    
    if (!results.oauth) {
      warningMessage += ' OAuth configuration issues detected.';
    }
    
    if (!results.icons) {
      warningMessage += ' Icon loading issues detected.';
    }
    
    if (!results.storage) {
      warningMessage += ' Storage access issues detected.';
    }
    
    warningElement.textContent = warningMessage;
    
    // Add the warning to the page
    const container = document.querySelector('.content');
    if (container) {
      container.insertBefore(warningElement, container.firstChild);
    }
    
    logger.error(warningMessage);
  }
}
