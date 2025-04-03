
/**
 * Utility functions for gallery state management
 */

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
    console.error('Error checking gallery state:', error);
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
      resolve();
    });
  });
}
