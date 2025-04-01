
// Shared type definitions for gallery images
export type GalleryImage = {
  id: string;
  url: string;
  src?: string; // For compatibility with extension data
  prompt?: string;
  alt?: string;
  title?: string;
  platform?: string;
  creationDate?: string;
  sourceURL: string;
  tabUrl?: string;
  timestamp: number;
  type?: string;
  // Additional optional fields for AI generation metadata
  model?: string;
  seed?: string;
  status?: string;
  // Platform-specific fields
  platformName?: string;
  favicon?: string;
  tabTitle?: string;
  naturalWidth?: number;
  naturalHeight?: number;
  domain?: string;
  path?: string;
  pageTitle?: string;
  // Domain/platform verification
  fromSupportedDomain?: boolean;
  // Deduplication helpers
  imageHash?: string;
};

// List of supported domains for auto-sync
export const SUPPORTED_DOMAINS = [
  'midjourney.com',
  'www.midjourney.com',
  'openai.com',
  'chat.openai.com',
  'labs.openai.com',
  'leonardo.ai',
  'www.leonardo.ai',
  'app.leonardo.ai',
  'runwayml.com',
  'www.runwayml.com',
  'runway.com',
  'pika.art',
  'www.pika.art',
  'beta.dreamstudio.ai',
  'dreamstudio.ai',
  'stability.ai'
];

// List of supported paths/routes that are gallery or creation pages
export const SUPPORTED_PATHS = [
  '/imagine',
  '/archive',
  '/app',
  '/feed',
  '/gallery',
  '/create',
  '/generations',
  '/projects',
  '/dalle',
  '/playground',
  '/assets',
  '/workspace',
  '/dream',
  '/video'
];

// Function to check if a URL is from a supported domain and path
export function isSupportedURL(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const isDomainSupported = SUPPORTED_DOMAINS.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );
    
    // Check if the path is supported
    const isPathSupported = SUPPORTED_PATHS.some(path => 
      urlObj.pathname === path || urlObj.pathname.startsWith(path)
    );

    // Special case for OpenAI dalleCreate path
    if (urlObj.hostname.includes('openai.com') && 
        (urlObj.pathname.includes('/image') || urlObj.pathname.includes('/dalle'))) {
      return true;
    }
    
    return isDomainSupported && isPathSupported;
  } catch (e) {
    console.error('Error parsing URL:', e);
    return false;
  }
}
