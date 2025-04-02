
// Common utilities for the Chrome extension

/**
 * Get the current environment
 * @returns {string} The current environment (production, staging, development)
 */
export function getEnvironment() {
  // For now, we're always using the preview domain for testing
  return 'preview';
}

/**
 * Get the auth URL for the MainGallery app
 * @returns {string} The auth URL
 */
export function getAuthUrl() {
  // Use preview domain for all auth flows
  return 'https://preview-main-gallery-ai.lovable.app/auth';
}

/**
 * Get the gallery URL for the MainGallery app
 * @returns {string} The gallery URL
 */
export function getGalleryUrl() {
  // Use preview domain for all galleries
  return 'https://preview-main-gallery-ai.lovable.app/gallery';
}

/**
 * Get the auth callback URL for OAuth providers
 * @returns {string} The auth callback URL
 */
export function getAuthCallbackUrl() {
  // Use preview domain for all auth callbacks
  return 'https://preview-main-gallery-ai.lovable.app/auth/callback';
}

/**
 * Get the platform name from the platform ID
 * @param {string} platformId The platform ID
 * @returns {string} The platform name
 */
export function getPlatformName(platformId) {
  const platformNames = {
    'midjourney': 'Midjourney',
    'dalle': 'DALL-E',
    'leonardo': 'Leonardo.AI',
    'stability': 'Stability AI',
    'runway': 'Runway',
    'pika': 'Pika Labs',
    'playground': 'Playground AI',
    'nightcafe': 'NightCafe',
    'discord': 'Discord'
  };
  
  return platformNames[platformId] || platformId;
}

/**
 * Format a date for display
 * @param {string|number|Date} date The date to format
 * @returns {string} The formatted date
 */
export function formatDate(date) {
  if (!date) return '';
  
  const d = new Date(date);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
}

/**
 * Create a unique ID
 * @returns {string} A unique ID
 */
export function uniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Log a message to the console
 * @param {string} message The message to log
 * @param {'info'|'warn'|'error'} level The log level
 */
export function log(message, level = 'info') {
  const prefix = '[MainGallery]';
  
  switch (level) {
    case 'warn':
      console.warn(prefix, message);
      break;
    case 'error':
      console.error(prefix, message);
      break;
    default:
      console.log(prefix, message);
  }
}
