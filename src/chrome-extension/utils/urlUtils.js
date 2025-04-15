
/**
 * URL Utilities for the MainGallery.AI extension
 * Provides consistent URL handling
 */

// Base URL for the application
const BASE_URL = 'https://main-gallery-ai.lovable.app';

/**
 * Get the base URL for the application
 * @returns {string} The base URL
 */
export function getBaseUrl() {
  return BASE_URL;
}

/**
 * Get the gallery URL
 * @returns {string} The gallery URL
 */
export function getGalleryUrl() {
  return `${getBaseUrl()}/gallery`;
}

/**
 * Get the auth URL with options
 * @param {Object} options - Options for the auth URL
 * @param {string} [options.from] - The source of the request
 * @param {string} [options.redirect] - Where to redirect after auth
 * @returns {string} The auth URL with query parameters
 */
export function getAuthUrl(options = {}) {
  const baseUrl = getBaseUrl();
  const authPath = '/auth';
  
  // Build query string from options
  const queryParams = new URLSearchParams();
  
  if (options.from) {
    queryParams.append('from', options.from);
  }
  
  if (options.redirect) {
    queryParams.append('redirect_to', options.redirect);
  }
  
  // Add extension flag
  queryParams.append('extension', 'true');
  
  const queryString = queryParams.toString();
  return `${baseUrl}${authPath}${queryString ? '?' + queryString : ''}`;
}

/**
 * Check if a URL matches any supported platform
 * @param {string} url - URL to check
 * @returns {boolean} Whether the URL is from a supported platform
 */
export function isSupportedPlatformUrl(url) {
  if (!url) return false;
  
  // List of supported AI platforms
  const aiPlatforms = [
    'midjourney.com',
    'leonardo.ai',
    'openai.com',
    'dreamstudio.ai',
    'stability.ai',
    'runwayml.com',
    'pika.art',
    'playgroundai.com',
    'nightcafe.studio',
    'firefly.adobe.com'
  ];
  
  try {
    const urlObj = new URL(url);
    return aiPlatforms.some(domain => urlObj.hostname.includes(domain));
  } catch (e) {
    console.error('Error parsing URL:', e);
    return false;
  }
}

/**
 * Build a URL with query parameters
 * @param {string} baseUrl - Base URL
 * @param {string} path - URL path
 * @param {Object} params - Query parameters
 * @returns {string} Complete URL
 */
export function buildUrl(baseUrl, path, params = {}) {
  const url = new URL(path, baseUrl);
  
  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });
  
  return url.toString();
}

/**
 * Get API URL
 * @param {string} endpoint - API endpoint
 * @returns {string} API URL
 */
export function getApiUrl(endpoint) {
  return `${getBaseUrl()}/api${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
}

