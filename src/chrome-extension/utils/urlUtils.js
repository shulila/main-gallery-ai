
/**
 * URL Utilities for the MainGallery.AI extension
 * Provides consistent URL handling and environment detection
 */

// Detect if running in preview environment
export function isPreviewEnvironment() {
  // First check if we have a stored environment setting
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(['environment'], (result) => {
        if (result.environment === 'preview') {
          resolve(true);
        } else if (result.environment === 'production') {
          resolve(false);
        } else {
          // Fall back to domain detection
          detectEnvironmentFromDomain().then(resolve);
        }
      });
    } catch (err) {
      // Fall back to domain detection
      detectEnvironmentFromDomain().then(resolve);
    }
  });
}

// Detect environment by checking the domain
function detectEnvironmentFromDomain() {
  return new Promise((resolve) => {
    try {
      // Check background page location if available
      if (typeof self !== 'undefined' && self.location) {
        const hostname = self.location.hostname;
        if (hostname.includes('preview-main-gallery-ai') || 
            hostname.includes('preview--main-gallery-ai')) {
          resolve(true);
          return;
        }
      }
      
      // If we can't detect from location, default to production
      resolve(false);
    } catch (err) {
      // Default to production in case of any error
      resolve(false);
    }
  });
}

// Get the base URL with environment detection
export function getBaseUrl() {
  // Use synchronous version for simplicity
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      let isPreview = false;
      chrome.storage.local.get(['environment'], (result) => {
        isPreview = result.environment === 'preview';
      });
      
      if (isPreview) {
        return 'https://preview-main-gallery-ai.lovable.app';
      }
    } catch (err) {
      // Ignore errors and default to production
    }
  }
  
  // Default to production
  return 'https://main-gallery-ai.lovable.app';
}

// Get the gallery URL
export function getGalleryUrl() {
  return `${getBaseUrl()}/gallery`;
}

// Get the auth URL with options
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

// Check if a URL matches any supported platform
export function isSupportedPlatformUrl(url) {
  // Import SUPPORTED_DOMAINS from a shared config
  if (!url) return false;
  
  // Simplified check for common AI platforms
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
