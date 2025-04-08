
/**
 * URL utility functions for MainGallery.AI
 */

import { logger } from './logger.js';

// Supported platforms for extension activation - same as in auth.js
const SUPPORTED_PLATFORMS = [
  'midjourney.com',
  'leonardo.ai',
  'openai.ai',
  'openai.com',
  'dreamstudio.ai',
  'stability.ai',
  'runwayml.com',
  'pika.art',
  'discord.com/channels',
  'playgroundai.com',
  'creator.nightcafe.studio'
];

/**
 * Check if a URL is from a supported AI platform
 * @param {string} url - The URL to check
 * @returns {boolean} True if supported, false otherwise
 */
export function isSupportedPlatformUrl(url) {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    return SUPPORTED_PLATFORMS.some(platform => 
      urlObj.hostname.includes(platform) || 
      (platform.includes('discord.com') && urlObj.pathname.includes('midjourney'))
    );
  } catch (err) {
    logger.error('Error checking URL support:', err);
    return false;
  }
}

/**
 * Extract platform identifier from URL
 * @param {string} url - The URL to analyze
 * @returns {string|null} Platform identifier or null if not recognized
 */
export function getPlatformIdFromUrl(url) {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    
    for (const platform of SUPPORTED_PLATFORMS) {
      if (urlObj.hostname.includes(platform)) {
        // Return cleaned platform identifier (remove .com etc)
        return platform.split('.')[0];
      }
    }
    
    // Special case for Discord + Midjourney
    if (urlObj.hostname.includes('discord.com') && 
        urlObj.pathname.includes('midjourney')) {
      return 'midjourney';
    }
    
    return null;
  } catch (err) {
    logger.error('Error getting platform ID from URL:', err);
    return null;
  }
}

/**
 * Determine if the current environment is the preview environment
 * This function is critical for routing to the correct endpoints
 * @returns {boolean} True if in preview environment, false otherwise
 */
export function isPreviewEnvironment() {
  // This value is forced during build time by build-extension.js
  // DO NOT MODIFY this function as it will be replaced during build
  
  // DEFAULT ENVIRONMENT VALUE - Will be replaced during build
  // When building with --preview flag, this will be set to true
  return false; // Default to production for safety
}

/**
 * Get the correct base URL for the current environment
 * @returns {string} The base URL for the current environment
 */
export function getBaseUrl() {
  if (isPreviewEnvironment()) {
    return 'https://preview-main-gallery-ai.lovable.app';
  }
  
  // Default to production domain
  return 'https://main-gallery-ai.lovable.app';
}

/**
 * Get the correct gallery URL based on environment
 * @returns {string} The gallery URL
 */
export function getGalleryUrl() {
  return `${getBaseUrl()}/gallery`;
}

/**
 * Get the correct auth URL based on environment
 * @param {object} options - Additional options for the URL
 * @returns {string} The auth URL with query parameters
 */
export function getAuthUrl(options = {}) {
  // Base URL depending on environment
  const baseUrl = `${getBaseUrl()}/auth`;
  
  // Add query parameters if provided
  const params = new URLSearchParams();
  if (options.from) params.append('from', options.from);
  if (options.redirect) params.append('redirect', options.redirect);
  
  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Is URL an authentication callback URL?
 * @param {string} url - The URL to check
 * @returns {boolean} True if it's an auth callback URL
 */
export function isAuthCallbackUrl(url) {
  if (!url) return false;
  
  try {
    return (
      url.includes('main-gallery-ai.lovable.app/auth/callback') || 
      url.includes('preview-main-gallery-ai.lovable.app/auth/callback') ||
      url.includes('/auth?access_token=')
    );
  } catch (err) {
    logger.error('Error checking if URL is auth callback:', err);
    return false;
  }
}
