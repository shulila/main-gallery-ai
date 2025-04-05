
/**
 * Utility functions for gallery state management
 */

import { logger } from './logger.js';
import { getBaseUrl } from './urlUtils.js';

/**
 * Check if gallery is empty based on localStorage data
 * @returns {Promise<boolean>} True if gallery is empty, false otherwise
 */
export async function isGalleryEmpty() {
  try {
    // First check localStorage for any previously synced images
    return new Promise((resolve) => {
      chrome.storage.local.get(['gallery_has_images'], (result) => {
        if (result && result.gallery_has_images === true) {
          // We have previously synced images
          resolve(false);
        } else {
          // No images found in storage
          resolve(true);
        }
      });
    });
  } catch (error) {
    logger.error('Error checking gallery state:', error);
    // Default to empty gallery in case of error
    return true;
  }
}

/**
 * Set gallery state after successful image sync
 * @param {boolean} hasImages - Whether gallery has images
 * @returns {Promise<void>}
 */
export async function setGalleryHasImages(hasImages = true) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ 'gallery_has_images': hasImages }, () => {
      logger.log(`Gallery state updated: hasImages=${hasImages}`);
      resolve();
    });
  });
}

/**
 * Clear gallery state
 * @returns {Promise<void>}
 */
export async function clearGalleryState() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['gallery_has_images'], () => {
      logger.log('Gallery state cleared');
      resolve();
    });
  });
}

/**
 * Handle cleanup when an error occurs during image sync
 */
export async function handleGallerySyncError(error) {
  logger.error('Gallery sync error:', error);
  // Don't change gallery state on error, as it might be a temporary issue
}

/**
 * Get the gallery URL with appropriate environment detection
 * @param {object} options - Query parameters to add to the URL
 * @returns {string} The gallery URL
 */
export function getGalleryUrl(options = {}) {
  const baseUrl = `${getBaseUrl()}/gallery`;
  
  // Add query parameters if provided
  if (options && Object.keys(options).length > 0) {
    const params = new URLSearchParams();
    
    for (const [key, value] of Object.entries(options)) {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    }
    
    const queryString = params.toString();
    if (queryString) {
      return `${baseUrl}?${queryString}`;
    }
  }
  
  return baseUrl;
}

/**
 * Get stored sync images from session storage
 * @returns {Array} Array of images or empty array if none found
 */
export function getStoredSyncImages() {
  try {
    const storedImagesJson = sessionStorage.getItem('maingallery_sync_images');
    if (!storedImagesJson) return [];
    
    const images = JSON.parse(storedImagesJson);
    return Array.isArray(images) ? images : [];
  } catch (error) {
    logger.error('Error getting stored sync images:', error);
    return [];
  }
}

/**
 * Store images in session storage for later retrieval
 * @param {Array} images - Array of image objects
 * @returns {boolean} Success status
 */
export function storeImagesForSync(images) {
  try {
    if (!Array.isArray(images) || images.length === 0) {
      return false;
    }
    
    sessionStorage.setItem('maingallery_sync_images', JSON.stringify(images));
    return true;
  } catch (error) {
    logger.error('Error storing images for sync:', error);
    return false;
  }
}
