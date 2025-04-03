
/**
 * URL and domain utilities for MainGallery.AI
 */

import { handleError } from './errorHandler.js';

/**
 * Check if a string is a valid URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if URL is valid
 */
export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Check if a URL is from a supported AI platform
 * @param {string} url - URL to check
 * @returns {boolean} True if URL is from a supported platform
 */
export function isSupportedPlatformUrl(url) {
  if (!url) return false;
  
  // Skip chrome:// URLs and extension pages
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
    return false;
  }
  
  try {
    const urlObj = new URL(url);
    
    // Supported domains
    const supportedDomains = [
      'midjourney.com',
      'www.midjourney.com',
      'openai.com',
      'leonardo.ai',
      'app.leonardo.ai',
      'runwayml.com',
      'pika.art',
      'dreamstudio.ai',
      'stability.ai',
      'playgroundai.com',
      'creator.nightcafe.studio'
    ];
    
    // Supported paths
    const supportedPaths = [
      '/app',
      '/archive',
      '/create',
      '/organize',
      '/generate',
      '/workspace',
      '/dall-e'
    ];
    
    // Check domain match
    const isDomainSupported = supportedDomains.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );
    
    // Check if path is supported
    const isPathSupported = supportedPaths.some(path => 
      urlObj.pathname === path || urlObj.pathname.startsWith(path)
    );
    
    // Special case for OpenAI
    if (urlObj.hostname.includes('openai.com') && urlObj.pathname.includes('/dall-e')) {
      return true;
    }
    
    // Special case for Midjourney - accept any URL on midjourney.com
    if (urlObj.hostname.includes('midjourney.com')) {
      return true;
    }
    
    // Special case for Discord with Midjourney bot
    if (urlObj.hostname.includes('discord.com') && urlObj.pathname.includes('midjourney')) {
      return true;
    }
    
    return isDomainSupported && isPathSupported;
  } catch (error) {
    handleError('isSupportedPlatformUrl', error, { silent: true });
    return false;
  }
}

/**
 * Get the platform ID from a URL
 * @param {string} url - URL to analyze
 * @returns {string} Platform ID or 'unknown'
 */
export function getPlatformIdFromUrl(url) {
  try {
    const urlObj = new URL(url);
    
    if (urlObj.hostname.includes('midjourney')) return 'midjourney';
    if (urlObj.hostname.includes('leonardo')) return 'leonardo';
    if (urlObj.hostname.includes('openai')) return 'dalle';
    if (urlObj.hostname.includes('pika')) return 'pika';
    if (urlObj.hostname.includes('runway')) return 'runway';
    if (urlObj.hostname.includes('stability') || urlObj.hostname.includes('dreamstudio')) return 'stability';
    if (urlObj.hostname.includes('playgroundai')) return 'playground';
    if (urlObj.hostname.includes('nightcafe')) return 'nightcafe';
    if (urlObj.hostname.includes('discord')) return 'discord';
    
    return 'unknown';
  } catch (error) {
    handleError('getPlatformIdFromUrl', error, { silent: true });
    return 'unknown';
  }
}

/**
 * Get the production domain for MainGallery
 * @returns {string} Production domain
 */
export function getProductionDomain() {
  return 'main-gallery-hub.lovable.app';
}

/**
 * Get the preview domain for MainGallery
 * @returns {string} Preview domain
 */
export function getPreviewDomain() {
  return 'preview-main-gallery-ai.lovable.app';
}

/**
 * Check if the current domain is the production domain
 * @returns {boolean} True if on production domain
 */
export function isProductionDomain() {
  return window.location.hostname === getProductionDomain();
}

/**
 * Fix domain if on preview but should be on production
 * @param {string} url - Current URL
 * @returns {string|null} Corrected URL or null if no change needed
 */
export function getCorrectDomainUrl(url) {
  try {
    const currentUrl = new URL(url);
    
    // If on preview domain with auth token, should be on production
    if (
      currentUrl.hostname === getPreviewDomain() &&
      (currentUrl.hash.includes('access_token=') || 
       currentUrl.search.includes('access_token='))
    ) {
      return url.replace(getPreviewDomain(), getProductionDomain());
    }
    
    return null;
  } catch (error) {
    handleError('getCorrectDomainUrl', error, { silent: true });
    return null;
  }
}

/**
 * Get the gallery URL
 * @returns {string} URL for the gallery page
 */
export function getGalleryUrl() {
  return `https://${getProductionDomain()}/gallery`;
}
