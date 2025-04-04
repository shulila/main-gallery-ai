
/**
 * Scroll configuration for MainGallery.AI extension
 * Centralizes scroll-related settings for consistency and easier maintenance
 */

// Default scroll configuration
export const DEFAULT_SCROLL_CONFIG = {
  // Delay between scroll steps in milliseconds
  scrollDelay: 500,
  
  // Number of pixels to scroll in each step
  scrollStep: 800,
  
  // Maximum number of scrolls to perform (to prevent infinite scrolling)
  maxScrolls: 100,
  
  // Whether to show toast notifications during scrolling
  showProgress: true,
  
  // Duration to wait for dynamic content to load after each scroll (ms)
  waitAfterScroll: 200,
  
  // Whether to scroll automatically
  autoScroll: true,
  
  // Whether to wait for image loading before continuing
  waitForImages: true,
  
  // Timeout for the entire scrolling operation (ms)
  scrollTimeout: 60000 // 1 minute
};

/**
 * Get scroll configuration with customizable overrides
 * @param {Object} overrides - Custom scroll settings to override defaults
 * @returns {Object} Final scroll configuration
 */
export function getScrollConfig(overrides = {}) {
  return {
    ...DEFAULT_SCROLL_CONFIG,
    ...overrides
  };
}

/**
 * Calculate estimated time for scroll operation
 * @param {Object} config - Scroll configuration
 * @returns {number} Estimated time in milliseconds
 */
export function estimateScrollTime(config) {
  const { scrollDelay, maxScrolls, waitAfterScroll } = getScrollConfig(config);
  return maxScrolls * (scrollDelay + waitAfterScroll);
}

/**
 * Create a specialized scroll configuration for a particular platform
 * @param {string} platformId - Platform identifier (e.g., 'midjourney', 'dall-e')
 * @returns {Object} Platform-specific scroll configuration
 */
export function getPlatformScrollConfig(platformId) {
  switch (platformId?.toLowerCase()) {
    case 'midjourney':
      return getScrollConfig({
        scrollDelay: 800,  // Midjourney needs more time to load images
        waitAfterScroll: 500,
        maxScrolls: 150    // Midjourney often has many images
      });
    
    case 'dall-e':
    case 'openai':
      return getScrollConfig({
        scrollDelay: 400,
        waitAfterScroll: 300
      });
      
    case 'leonardo':
      return getScrollConfig({
        scrollDelay: 600,
        waitAfterScroll: 400
      });
    
    default:
      return getScrollConfig();
  }
}

export default {
  DEFAULT_SCROLL_CONFIG,
  getScrollConfig,
  estimateScrollTime,
  getPlatformScrollConfig
};
