
/**
 * Image handling utilities for MainGallery.AI Chrome Extension
 */

import { logger } from './logger.js';

/**
 * Set up error handling for images
 * Shows fallback content or applies error styling when images fail to load
 */
export function setupImageErrorHandling() {
  const images = document.querySelectorAll('img');
  
  images.forEach(img => {
    // Set onload to remove any error classes that might have been added previously
    img.onload = function() {
      this.classList.remove('error', 'fallback');
    };
    
    // Handle image loading errors
    img.onerror = function() {
      logger.warn(`Failed to load image: ${this.src}`);
      this.classList.add('error');
      
      // If this is a logo or important UI element, show fallback content
      if (this.classList.contains('logo') || this.classList.contains('provider-icon')) {
        this.classList.add('fallback');
        
        // For Google icon specifically
        if (this.src.includes('google-icon.svg')) {
          // Create a simple "G" text as fallback
          this.style.display = 'flex';
          this.style.alignItems = 'center';
          this.style.justifyContent = 'center';
          this.style.fontWeight = 'bold';
          this.style.color = '#4285F4';
          this.innerText = 'G';
        }
        // For main logo
        else if (this.classList.contains('logo')) {
          this.style.display = 'flex';
          this.style.alignItems = 'center';
          this.style.justifyContent = 'center';
          this.style.fontWeight = 'bold';
          this.style.color = 'var(--brand-primary)';
          this.innerText = 'MG';
        }
      } else {
        // For non-critical images, hide them
        this.style.display = 'none';
      }
    };
    
    // Force check for already loaded or failed images
    if (img.complete) {
      if (img.naturalWidth === 0) {
        img.onerror();
      } else {
        img.onload();
      }
    }
  });
}

/**
 * Preload critical images to avoid UI flicker
 * @param {Array<string>} imagePaths - Array of image paths to preload
 * @returns {Promise<void>} - Resolves when all images are loaded or failed
 */
export function preloadCriticalImages(imagePaths) {
  return Promise.all(
    imagePaths.map(path => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => {
          logger.warn(`Failed to preload image: ${path}`);
          resolve(false);
        };
        img.src = path;
      });
    })
  );
}
