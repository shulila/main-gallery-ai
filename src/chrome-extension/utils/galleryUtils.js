
/**
 * Utilities for gallery management in MainGallery.AI extension
 */

import { logger } from './logger.js';
import { isPreviewEnvironment, getBaseUrl } from './urlUtils.js';

/**
 * Check if the gallery is empty
 * @returns {Promise<boolean>} True if gallery is empty
 */
export function isGalleryEmpty() {
  return new Promise((resolve) => {
    try {
      // Check if we have a flag in storage
      chrome.storage.local.get(['gallery_has_images'], (result) => {
        // If flag exists and is true, gallery is not empty
        resolve(!(result && result.gallery_has_images === true));
      });
    } catch (err) {
      logger.error('Error checking gallery state:', err);
      // Default to empty if we can't check
      resolve(true);
    }
  });
}

/**
 * Set the gallery state flag
 * @param {boolean} hasImages - Whether the gallery has images
 * @returns {Promise<boolean>} Success state
 */
export function setGalleryHasImages(hasImages) {
  return new Promise((resolve) => {
    try {
      // Store flag in local storage
      chrome.storage.local.set({ 'gallery_has_images': hasImages }, () => {
        if (chrome.runtime.lastError) {
          logger.error('Error saving gallery state:', chrome.runtime.lastError);
          resolve(false);
        } else {
          logger.info(`Gallery state updated: gallery_has_images=${hasImages}`);
          resolve(true);
        }
      });
    } catch (err) {
      logger.error('Error setting gallery state:', err);
      resolve(false);
    }
  });
}

/**
 * Reset gallery state
 * @returns {Promise<boolean>} Success state
 */
export function resetGalleryState() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.remove(['gallery_has_images'], () => {
        if (chrome.runtime.lastError) {
          logger.error('Error resetting gallery state:', chrome.runtime.lastError);
          resolve(false);
        } else {
          logger.info('Gallery state reset successfully');
          resolve(true);
        }
      });
    } catch (err) {
      logger.error('Error resetting gallery state:', err);
      resolve(false);
    }
  });
}

/**
 * Get the gallery images count from storage
 * @returns {Promise<number>} Number of images or 0 if none/error
 */
export function getGalleryImageCount() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(['gallery_image_count'], (result) => {
        if (result && typeof result.gallery_image_count === 'number') {
          resolve(result.gallery_image_count);
        } else {
          resolve(0);
        }
      });
    } catch (err) {
      logger.error('Error getting gallery image count:', err);
      resolve(0);
    }
  });
}

/**
 * Update the gallery images count in storage
 * @param {number} count - The new count
 * @returns {Promise<boolean>} Success state
 */
export function updateGalleryImageCount(count) {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.set({ 'gallery_image_count': count }, () => {
        if (chrome.runtime.lastError) {
          logger.error('Error updating gallery image count:', chrome.runtime.lastError);
          resolve(false);
        } else {
          logger.info(`Gallery image count updated: ${count}`);
          // Also update the has_images flag if count > 0
          if (count > 0) {
            setGalleryHasImages(true)
              .then(() => resolve(true))
              .catch(() => resolve(true)); // Still consider success even if flag update fails
          } else {
            resolve(true);
          }
        }
      });
    } catch (err) {
      logger.error('Error updating gallery image count:', err);
      resolve(false);
    }
  });
}

/**
 * Clear all gallery-related data from storage
 * @returns {Promise<boolean>} Success state
 */
export function clearGalleryData() {
  return new Promise((resolve) => {
    try {
      const keysToRemove = [
        'gallery_has_images',
        'gallery_image_count',
        'last_sync_timestamp'
      ];
      
      chrome.storage.local.remove(keysToRemove, () => {
        if (chrome.runtime.lastError) {
          logger.error('Error clearing gallery data:', chrome.runtime.lastError);
          resolve(false);
        } else {
          logger.info('Gallery data cleared successfully');
          resolve(true);
        }
      });
    } catch (err) {
      logger.error('Error clearing gallery data:', err);
      resolve(false);
    }
  });
}

/**
 * Get the gallery URL with environment detection
 * @returns {string} The correct gallery URL for current environment
 */
export function getEnvironmentAwareGalleryUrl() {
  // Use the environment detection from urlUtils
  return `${getBaseUrl()}/gallery`;
}

/**
 * Log current environment details for debugging
 */
export function logEnvironmentDetails() {
  const envType = isPreviewEnvironment() ? 'PREVIEW' : 'PRODUCTION';
  const baseUrl = getBaseUrl();
  
  logger.info(`Current environment: ${envType}`);
  logger.info(`Base URL: ${baseUrl}`);
  logger.info(`Gallery URL: ${getEnvironmentAwareGalleryUrl()}`);
  
  return {
    environment: envType,
    baseUrl: baseUrl,
    galleryUrl: getEnvironmentAwareGalleryUrl()
  };
}
