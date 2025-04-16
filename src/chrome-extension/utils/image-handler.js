
/**
 * Image handling utilities for MainGallery.AI Chrome Extension
 */

import { logger } from './logger.js';
import { handleError, ErrorTypes } from './error-handler.js';

/**
 * Add error handling to images in the document
 * @param {Document|Element} root - Root element to search for images
 * @returns {number} Number of images with error handling added
 */
export function setupImageErrorHandling(root = document) {
  try {
    const images = root.querySelectorAll('img');
    let errorCount = 0;
    let handledCount = 0;
    
    images.forEach(img => {
      // Skip if already has error handler
      if (img.getAttribute('data-error-handled')) {
        return;
      }
      
      // Mark as handled
      img.setAttribute('data-error-handled', 'true');
      handledCount++;
      
      // Original source for fallback
      const originalSrc = img.src;
      
      // Add error handler
      img.onerror = function() {
        errorCount++;
        logger.warn(`Failed to load image: ${this.src}`);
        
        // Try alternative path if in assets/icons
        if (this.src.includes('assets/icons/')) {
          const altPath = this.src.replace('assets/icons/', 'icons/');
          logger.log(`Trying alternative path: ${altPath}`);
          this.src = altPath;
          
          // If this fails too, show placeholder
          this.onerror = function() {
            logger.error(`Failed to load image from alternative path: ${altPath}`);
            this.classList.add('error');
            this.style.display = 'inline-block';
            this.style.width = this.getAttribute('width') || '24px';
            this.style.height = this.getAttribute('height') || '24px';
            this.style.backgroundColor = '#F1F0FB';
            this.style.borderRadius = '4px';
          };
        } else if (this.src.includes('icons/')) {
          // Try assets/icons if failed from icons/
          const altPath = this.src.replace('icons/', 'assets/icons/');
          logger.log(`Trying alternative path: ${altPath}`);
          this.src = altPath;
          
          // If this fails too, show placeholder
          this.onerror = function() {
            logger.error(`Failed to load image from alternative path: ${altPath}`);
            this.classList.add('error');
            this.style.display = 'inline-block';
            this.style.width = this.getAttribute('width') || '24px';
            this.style.height = this.getAttribute('height') || '24px';
            this.style.backgroundColor = '#F1F0FB';
            this.style.borderRadius = '4px';
          };
        } else {
          // Non-icon images just show placeholder
          this.classList.add('error');
          this.style.display = 'inline-block';
          this.style.width = this.getAttribute('width') || '24px';
          this.style.height = this.getAttribute('height') || '24px';
          this.style.backgroundColor = '#F1F0FB';
          this.style.borderRadius = '4px';
        }
      };
      
      // Force reload to ensure error handler works
      if (img.complete) {
        const currentSrc = img.src;
        img.src = '';
        img.src = currentSrc;
      }
    });
    
    if (errorCount > 0) {
      logger.warn(`${errorCount} images failed to load and were handled`);
    }
    
    return handledCount;
  } catch (error) {
    return handleError('setupImageErrorHandling', error, {
      type: ErrorTypes.RESOURCE,
      returnValue: -1
    }).value;
  }
}

/**
 * Preload critical images
 * @param {string[]} paths - Array of image paths to preload (relative to extension root)
 * @returns {Promise<boolean>} Whether all images loaded successfully
 */
export async function preloadImages(paths) {
  const results = {};
  let allSuccess = true;
  
  const defaultPaths = [
    'assets/icons/logo-icon-only.svg',
    'icons/logo-icon-only.svg',
    'assets/icons/google-icon.svg',
    'icons/google-icon.svg'
  ];
  
  const imagePaths = paths?.length > 0 ? paths : defaultPaths;
  
  for (const path of imagePaths) {
    try {
      const fullPath = chrome.runtime.getURL(path);
      const success = await preloadImage(fullPath);
      
      results[path] = success;
      if (!success) {
        allSuccess = false;
      }
    } catch (error) {
      logger.error(`Error preloading image ${path}:`, error);
      results[path] = false;
      allSuccess = false;
    }
  }
  
  logger.log('Image preload results:', results);
  return allSuccess;
}

/**
 * Preload a single image
 * @param {string} src - Image source URL
 * @returns {Promise<boolean>} Whether the image loaded successfully
 */
function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

/**
 * Get absolute URL for extension resource
 * @param {string} path - Resource path relative to extension root
 * @returns {string} Absolute URL
 */
export function getExtensionResourceUrl(path) {
  try {
    return chrome.runtime.getURL(path);
  } catch (error) {
    logger.error(`Error getting extension resource URL for ${path}:`, error);
    // Fallback to a relative path
    return path;
  }
}

/**
 * Apply advanced image error handling with fallbacks
 * @param {HTMLImageElement} img - Image element to handle
 * @param {string[]} fallbackPaths - Array of fallback paths to try
 */
export function setupAdvancedImageErrorHandling(img, fallbackPaths) {
  if (!img || !Array.isArray(fallbackPaths) || fallbackPaths.length === 0) {
    return;
  }
  
  // Mark as handled
  img.setAttribute('data-advanced-error-handled', 'true');
  
  let currentPathIndex = 0;
  const originalSrc = img.src;
  
  img.onerror = function handleImageError() {
    if (currentPathIndex >= fallbackPaths.length) {
      // All fallbacks failed, show placeholder
      logger.error(`All fallback paths failed for image: ${originalSrc}`);
      this.classList.add('error', 'fallback');
      this.style.visibility = 'hidden';
      this.insertAdjacentHTML('afterend', `<div class="image-placeholder" title="Failed to load image"></div>`);
      return;
    }
    
    const nextPath = fallbackPaths[currentPathIndex++];
    logger.warn(`Image load failed, trying fallback ${currentPathIndex}/${fallbackPaths.length}: ${nextPath}`);
    
    try {
      const fullPath = chrome.runtime.getURL(nextPath);
      this.src = fullPath;
    } catch (error) {
      // If getURL fails, try the path directly
      this.src = nextPath;
    }
  };
  
  // Force reload if already loaded
  if (img.complete) {
    const tempSrc = img.src;
    img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    setTimeout(() => {
      img.src = tempSrc;
    }, 0);
  }
}
