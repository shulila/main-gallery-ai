
/**
 * URL utility functions for MainGallery.AI
 */

import { logger } from './logger.js';

// Supported platforms for extension activation - same as in auth.js
const SUPPORTED_PLATFORMS = [
  'midjourney.com',
  'leonardo.ai',
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
 * Get the correct gallery URL based on environment
 * @returns {string} The gallery URL
 */
export function getGalleryUrl() {
  // Check if in preview environment
  if (typeof window !== 'undefined' && 
      window.location && 
      window.location.hostname && 
      window.location.hostname.includes('preview')) {
    return 'https://preview-main-gallery-ai.lovable.app/gallery';
  }
  
  // Default to production domain
  return 'https://main-gallery-hub.lovable.app/gallery';
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
      url.includes('main-gallery-hub.lovable.app/auth/callback') || 
      url.includes('preview-main-gallery-ai.lovable.app/auth/callback') ||
      url.includes('/auth?access_token=')
    );
  } catch (err) {
    logger.error('Error checking if URL is auth callback:', err);
    return false;
  }
}
