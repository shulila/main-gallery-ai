
/**
 * Configuration for MainGallery.AI Chrome Extension
 */

// Web app URLs
export const WEB_APP_URLS = {
  BASE: 'https://main-gallery-ai.lovable.app',
  AUTH_CALLBACK: 'https://main-gallery-ai.lovable.app/auth/callback',
  GALLERY: 'https://main-gallery-ai.lovable.app/gallery',
  AUTH_ERROR: 'https://main-gallery-ai.lovable.app/auth-error'
};

// Authentication timeouts
export const AUTH_TIMEOUTS = {
  AUTH_FLOW_TIMEOUT: 5 * 60 * 1000, // 5 minutes
  AUTH_SYNC_INTERVAL: 5 * 60 * 1000, // 5 minutes
  TOKEN_REFRESH_BUFFER: 5 * 60 * 1000 // 5 minutes
};

// Supported platforms
export const SUPPORTED_PLATFORMS = [
  {
    name: 'Midjourney',
    domain: 'midjourney.com',
    selector: '.image-button'
  },
  {
    name: 'DALL-E',
    domain: 'openai.com',
    selector: '.dalle-image'
  },
  {
    name: 'Leonardo.AI',
    domain: 'leonardo.ai',
    selector: '.gallery-image'
  },
  {
    name: 'Runway',
    domain: 'runwayml.com',
    selector: '.image-container'
  },
  {
    name: 'Stability AI',
    domain: 'stability.ai',
    selector: '.image-result'
  }
];

// Export combined config
export const CONFIG = {
  WEB_APP_URLS,
  AUTH_TIMEOUTS,
  SUPPORTED_PLATFORMS,
  DEBUG_MODE: false
};
