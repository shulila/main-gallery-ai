
// Constants
export const MAIN_GALLERY_API_URL = 'https://maingallery.app/api';
export const DUMMY_API_URL = 'https://dummyapi.io/collect';

// Platform name mapping
export function getPlatformName(platformId) {
  const platformNames = {
    midjourney: 'Midjourney',
    dalle: 'DALL·E',
    stableDiffusion: 'Stable Diffusion',
    runway: 'Runway',
    pika: 'Pika',
    leonardo: 'Leonardo.ai'
  };
  
  return platformNames[platformId] || platformId;
}

// Helper for getting URL from extension resources
export function getExtensionResourceUrl(resourcePath) {
  return chrome.runtime.getURL(resourcePath);
}

// Get the appropriate notification icon path based on size
export function getNotificationIconPath(size = 128) {
  // Chrome notification icons must be one of these sizes, defaulting to 128
  const validSize = [16, 48, 128].includes(size) ? size : 128;
  return `icons/icon${validSize}.png`;
}

// Debug helper to check if we're on a supported platform
export function debugPlatformDetection(url) {
  console.log('MainGallery: Checking platform detection for URL:', url);
  const platforms = [
    { id: 'midjourney', patterns: [/midjourney\.com/, /discord\.com\/channels.*midjourney/] },
    { id: 'dalle', patterns: [/openai\.com/] },
    { id: 'stableDiffusion', patterns: [/dreamstudio\.ai/, /stability\.ai/] },
    { id: 'runway', patterns: [/runwayml\.com/] },
    { id: 'pika', patterns: [/pika\.art/] },
    { id: 'leonardo', patterns: [/leonardo\.ai/] }
  ];
  
  for (const platform of platforms) {
    for (const pattern of platform.patterns) {
      if (pattern.test(url)) {
        console.log('MainGallery: Platform detected:', platform.id);
        return platform.id;
      }
    }
  }
  console.log('MainGallery: No supported platform detected');
  return null;
}

// Get gallery URL
export function getGalleryUrl() {
  return 'https://main-gallery.ai/app';
}
