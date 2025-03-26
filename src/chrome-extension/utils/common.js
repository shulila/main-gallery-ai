
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

// Notification icon helper function
export function getNotificationIconPath(size = 128) {
  // Verify the size is one of the available sizes
  const validSize = [16, 48, 128].includes(size) ? size : 128;
  return `icons/icon${validSize}.png`;
}
