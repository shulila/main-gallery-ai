
import { logger } from './logger.js';

/**
 * Add error handling to images in the document
 */
export function setupImageErrorHandling() {
  try {
    const images = document.querySelectorAll('img');
    let errorCount = 0;
    
    images.forEach(img => {
      // Skip if already has error handler
      if (img.getAttribute('data-error-handled')) {
        return;
      }
      
      // Mark as handled
      img.setAttribute('data-error-handled', 'true');
      
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
    
    return errorCount;
  } catch (error) {
    logger.error('Error setting up image error handling:', error);
    return -1;
  }
}

/**
 * Preload critical images
 * @returns {Promise<boolean>} Whether all images loaded successfully
 */
export async function preloadCriticalImages() {
  const criticalPaths = [
    'assets/icons/logo-icon-only.svg',
    'assets/icons/google-icon.svg',
    'icons/logo-icon-only.svg',
    'icons/google-icon.svg'
  ];
  
  let allSuccess = true;
  const results = {};
  
  for (const path of criticalPaths) {
    try {
      const fullPath = chrome.runtime.getURL(path);
      const success = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = fullPath;
      });
      
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
