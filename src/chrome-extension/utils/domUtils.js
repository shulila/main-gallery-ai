
/**
 * DOM utilities for MainGallery.AI
 * Handles element selection, scrolling, and UI interactions
 */

import { logger } from './logger.js';
import { handleError } from './errorHandler.js';
import { scrollConfig } from './scrollConfig.js';
import { getPlatformIdFromUrl } from './urlUtils.js';

/**
 * Generate a unique ID
 * @returns {string} A unique ID string
 */
export function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Create and show a toast notification
 * @param {string} message - Message to display
 * @param {'info'|'success'|'error'|'warning'} type - Toast type
 * @returns {HTMLElement} The toast DOM element
 */
export function showToast(message, type = 'info') {
  try {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = '999999';
    toast.style.padding = '10px 16px';
    toast.style.borderRadius = '4px';
    toast.style.fontSize = '14px';
    toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '8px';
    
    // Add icon
    const icon = document.createElement('span');
    
    if (type === 'error') {
      toast.style.background = '#f44336';
      toast.style.color = 'white';
      icon.innerHTML = '❌';
    } else if (type === 'success') {
      toast.style.background = '#4caf50';
      toast.style.color = 'white';
      icon.innerHTML = '✓';
    } else if (type === 'warning') {
      toast.style.background = '#ff9800';
      toast.style.color = 'white';
      icon.innerHTML = '⚠️';
    } else {
      toast.style.background = '#2196f3';
      toast.style.color = 'white';
      icon.innerHTML = 'ℹ️';
    }
    
    toast.prepend(icon);
    document.body.appendChild(toast);
    
    // Animate in
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      
      setTimeout(() => toast.remove(), 300);
    }, 4000);
    
    return toast;
  } catch (error) {
    handleError('showToast', error, { silent: true });
    return null;
  }
}

/**
 * Helper function to wait for a specified time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>} Promise that resolves after the delay
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get platform-specific image selectors based on current URL
 * @param {string} platform - Platform ID
 * @returns {string[]} Array of CSS selectors
 */
export function getImageSelectorsForPlatform(platform) {
  const commonSelectors = [
    'img[src]:not([src^="data:"])'
  ];
  
  // Platform-specific selectors
  const platformSelectors = {
    midjourney: [
      // Most specific selectors for generated images
      'img[src*="/generated/"]',
      'img[src*="cdn.midjourney.com"]',
      'img[src*="discord.com/channels"][src*="midjourney"]',
      
      // Common MJ grid layouts
      '.grid-card img', 
      '.imageContainer img', 
      '.image-grid-content img',
      '.showcase-grid img',
      '.gallery img',
      '[data-grid="true"] img',
      '.gridItemContainer img',
      
      // Feed item layouts
      '.feed-item img',
      '.card-img-top',
      '.mj-image',
      '.mj-result',
      
      // Job result containers
      '.job-card img',
      '.job-grid img',
      '.result-image img',
      '.result img',
      
      // New layouts (2025)
      '.midjourney-image-container img',
      '.midjourney-gallery-item img',
      '.image-result-container img',
      '.showcase-image img',
      '.mjgrid-item img',
      '[data-testid="image-result"] img'
    ],
    dalle: [
      '.dalle-image',
      '.generation-result img',
      '.image-generations img',
      '.dalle-result-image'
    ],
    leonardo: [
      '.gallery-image img',
      '.generation-item img',
      '.image-result-item img'
    ]
  };
  
  return [...(platformSelectors[platform] || []), ...commonSelectors];
}

/**
 * Get prompt text from an image or its parent elements
 * @param {HTMLImageElement} img - Image element
 * @param {string} platform - Platform ID
 * @returns {string} Extracted prompt text or empty string
 */
export function extractPromptFromImage(img, platform) {
  try {
    // First check alt text and title
    let prompt = img.alt || img.title || '';
    
    // If we already have a prompt, return it
    if (prompt) return prompt.trim();
    
    // Try to find prompt based on platform
    if (platform === 'midjourney') {
      // Try data-prompt attribute
      if (img.dataset && img.dataset.prompt) {
        prompt = img.dataset.prompt;
      }
      
      // Try parent element's data-prompt
      if (!prompt && img.parentElement && img.parentElement.dataset && img.parentElement.dataset.prompt) {
        prompt = img.parentElement.dataset.prompt;
      }
      
      // Try parent's parent element
      if (!prompt && img.parentElement && img.parentElement.parentElement) {
        const grandparent = img.parentElement.parentElement;
        if (grandparent.dataset && grandparent.dataset.prompt) {
          prompt = grandparent.dataset.prompt;
        }
      }
      
      // Try to find prompt text through closest selectors
      if (!prompt) {
        // Common Midjourney prompt containers
        const promptSelectors = [
          '.prompt-text',
          '.image-prompt',
          '.caption',
          '.card-text',
          '.job-text'
        ];
        
        for (const selector of promptSelectors) {
          // Try in parent or grandparent
          if (img.parentElement) {
            const promptElement = img.parentElement.querySelector(selector);
            if (promptElement && promptElement.textContent) {
              prompt = promptElement.textContent.trim();
              break;
            }
            
            // Try in grandparent
            if (!prompt && img.parentElement.parentElement) {
              const promptElement = img.parentElement.parentElement.querySelector(selector);
              if (promptElement && promptElement.textContent) {
                prompt = promptElement.textContent.trim();
                break;
              }
            }
          }
        }
      }
      
      // Look for nearby prompt text in button role elements (common in Midjourney UI)
      if (!prompt) {
        const nearbyText = img.closest('[role="button"]')?.parentElement?.textContent || '';
        if (nearbyText) {
          prompt = nearbyText;
        }
      }
    } else {
      // Generic prompt finding for other platforms
      if (img.parentElement) {
        const promptElement = img.parentElement.querySelector('.prompt, [data-prompt], .caption, .description');
        if (promptElement) {
          prompt = promptElement.textContent || '';
        }
      }
    }
    
    return prompt.trim();
  } catch (error) {
    handleError('extractPromptFromImage', error, { silent: true });
    return '';
  }
}

/**
 * Improved auto-scroll function that scrolls through the entire page
 * @param {Object} options - Configuration options
 * @param {number} [options.scrollStep] - How far to scroll each step
 * @param {number} [options.scrollDelay] - Delay between scrolls
 * @returns {Promise<boolean>} Whether scrolling completed successfully
 */
export async function autoScrollToBottom(options = {}) {
  const {
    scrollStep = scrollConfig.scrollStep,
    scrollDelay = scrollConfig.scrollDelay,
    maxScrollAttempts = scrollConfig.maxScrollAttempts,
    heightThreshold = scrollConfig.heightThreshold,
    extendedWaitPeriod = scrollConfig.extendedWaitPeriod,
    extendedWaitFrequency = scrollConfig.extendedWaitFrequency,
    totalTimeout = scrollConfig.totalTimeout
  } = options;
  
  try {
    logger.info('Starting auto-scroll to bottom');
    
    // Show scrolling toast
    showToast('Scanning page for AI images...', 'info');
    
    let lastScrollTop = -1;
    let currentScrollTop = 0;
    let scrollAttempts = 0;
    let startTime = Date.now();
    
    // Scroll until we reach the bottom, max attempts, or timeout
    while (
      Math.abs(lastScrollTop - currentScrollTop) >= heightThreshold && 
      scrollAttempts < maxScrollAttempts && 
      (Date.now() - startTime) < totalTimeout
    ) {
      lastScrollTop = currentScrollTop;
      window.scrollBy({ top: scrollStep, behavior: 'smooth' });
      await delay(scrollDelay);
      
      currentScrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      scrollAttempts++;
      
      logger.log(`Scroll attempt ${scrollAttempts}/${maxScrollAttempts}, position: ${currentScrollTop}`);
      
      // Wait longer every X scrolls to allow images to load
      if (scrollAttempts % extendedWaitFrequency === 0) {
        logger.log('Extended wait to allow images to load');
        await delay(extendedWaitPeriod);
      }
    }
    
    // Scroll back to top
    logger.log('Scrolling back to top');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await delay(500);
    
    // Report completion reason
    if (Math.abs(lastScrollTop - currentScrollTop) < heightThreshold) {
      logger.log(`Auto-scrolling complete: reached bottom of page after ${scrollAttempts} attempts`);
    } else if (scrollAttempts >= maxScrollAttempts) {
      logger.log(`Auto-scrolling complete: reached maximum scroll attempts (${maxScrollAttempts})`);
    } else if ((Date.now() - startTime) >= totalTimeout) {
      logger.log(`Auto-scrolling complete: reached timeout (${totalTimeout}ms)`);
    }
    
    showToast('Scan complete, extracting images...', 'success');
    return true;
  } catch (err) {
    handleError('autoScrollToBottom', err);
    showToast('Error while scanning page', 'error');
    return false;
  }
}

/**
 * Set up mutation observer for dynamic content
 * @param {Function} callback - Callback to run when mutations occur
 * @returns {MutationObserver|null} The observer instance or null on error
 */
export function setupMutationObserver(callback) {
  try {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    const observer = new MutationObserver((mutations) => {
      // Check if any images were added
      const hasNewImages = mutations.some(mutation => {
        return Array.from(mutation.addedNodes).some(node => {
          if (node.nodeName === 'IMG') return true;
          if (node.querySelectorAll) {
            return node.querySelectorAll('img').length > 0;
          }
          return false;
        });
      });
      
      if (hasNewImages) {
        logger.log('Mutation observer detected new images loaded');
        callback(mutations, hasNewImages);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });
    
    logger.log('Mutation observer set up for dynamic content');
    return observer;
  } catch (error) {
    handleError('setupMutationObserver', error);
    return null;
  }
}

/**
 * Set up an enhanced mutation observer specifically for Midjourney
 * @param {Function} callback - Callback to run when mutations occur
 * @returns {MutationObserver|null} The observer instance or null on error
 */
export function setupMidjourneyObserver(callback) {
  try {
    const observer = new MutationObserver((mutations) => {
      let shouldCallback = false;
      
      mutations.forEach(mutation => {
        // Look for added nodes that might be images or containers
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeName === 'IMG') {
              shouldCallback = true;
              break;
            }
            
            // Check if the node contains images
            if (node.querySelectorAll) {
              const images = node.querySelectorAll('img');
              if (images.length > 0) {
                shouldCallback = true;
                break;
              }
            }
          }
        }
        
        // Also check for attribute changes on images
        if (!shouldCallback && mutation.type === 'attributes') {
          if (mutation.target.nodeName === 'IMG' && mutation.attributeName === 'src') {
            shouldCallback = true;
          }
        }
      });
      
      if (shouldCallback && typeof callback === 'function') {
        const visibleImages = document.querySelectorAll('img[src]:not([src^="data:"])');
        logger.log(`Midjourney observer detected changes, ${visibleImages.length} visible images on page now`);
        callback(mutations, true);
      }
    });
    
    // Observe Midjourney DOM for changes with a more comprehensive configuration
    observer.observe(document.body, {
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['src']
    });
    
    logger.log('Enhanced Midjourney observer set up');
    return observer;
  } catch (error) {
    handleError('setupMidjourneyObserver', error);
    return null;
  }
}
