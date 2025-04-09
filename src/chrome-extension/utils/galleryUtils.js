import { logger } from './logger.js';

/**
 * Check if the user's gallery is empty
 * @returns {Promise<boolean>} Whether the gallery is empty
 */
export async function isGalleryEmpty() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(['gallery_has_images'], (result) => {
        // If we have a stored flag, use it
        if (result.gallery_has_images !== undefined) {
          resolve(!result.gallery_has_images);
        } else {
          // Otherwise assume it's empty (first-time user)
          resolve(true);
        }
      });
    } catch (error) {
      logger.error('Error checking if gallery is empty:', error);
      // Default to empty if there's an error
      resolve(true);
    }
  });
}

/**
 * Set whether the gallery has images
 * @param {boolean} hasImages - Whether the gallery has images
 * @returns {Promise<void>}
 */
export async function setGalleryHasImages(hasImages) {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.set({ gallery_has_images: hasImages }, () => {
        logger.log(`Gallery has images flag set to: ${hasImages}`);
        resolve();
      });
    } catch (error) {
      logger.error('Error setting gallery has images flag:', error);
      resolve();
    }
  });
}

/**
 * Log detailed environment information for debugging
 * @returns {Object} Environment details
 */
export function logEnvironmentDetails() {
  const details = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    cookiesEnabled: navigator.cookieEnabled,
    extensionId: chrome.runtime.id,
    manifestVersion: chrome.runtime.getManifest().manifest_version,
    extensionVersion: chrome.runtime.getManifest().version,
    buildTimestamp: Date.now()
  };
  
  return details;
}
