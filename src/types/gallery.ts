
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
  // Creation timestamp with formatted date
  createdAt: string;
};

// Updated list of supported domains for auto-sync using the approved list
export const SUPPORTED_DOMAINS = [
  'midjourney.com',
  'www.midjourney.com',
  'leonardo.ai',
  'app.leonardo.ai',
  'freepik.com',
  'www.freepik.com',
  'app.klingai.com',
  'dream-machine.lumalabs.ai',
  'pika.art',
  'krea.ai',
  'www.krea.ai',
  'hailuoai.video',
  'sora.com',
  'app.ltx.studio',
  'firefly.adobe.com',
  'fluxlabs.ai',
  'www.fluxlabs.ai',
  'studio.d-id.com',
  'app.heygen.com',
  'preview.reve.art',
  'lexica.art',
  'creator.nightcafe.studio',
  'looka.com',
  'reroom.ai',
  'genmo.ai',
  'www.genmo.ai',
  'app.botika.io',
  'playground.com',
  'dream.ai',
  'app.pixverse.ai',
  'starryai.com',
  'fotor.com',
  'www.fotor.com',
  'deviantart.com',
  'www.deviantart.com',
  'deepai.org',
  'app.elai.io',
  'app.rundiffusion.com',
  'neural.love',
  'vidu.com',
  'www.vidu.com',
  'promeai.pro',
  'www.promeai.pro',
  'genspark.ai',
  'www.genspark.ai'
];

// List of supported paths/routes that are gallery or creation pages - updated per the approved list
export const SUPPORTED_PATHS = [
  '/imagine',
  '/archive',
  '/library',
  '/pikaso/projects',
  '/global/user-assets/materials',
  '/ideas',
  '/my-library',
  '/assets',
  '/mine',
  '/media-manager',
  '/files',
  '/creations',
  '/video-studio',
  '/projects',
  '/app',
  '/history',
  '/my-creations',
  '/dashboard',
  '/account/history',
  '/play/creations',
  '/design/my-designs',
  '/profile',
  '/asset/video',
  '/asset/album',
  '/asset/character',
  '/dashboard/images',
  '/dashboard/videos',
  '/dashboard/characters',
  '/videos',
  '/runnit/library',
  '/orders',
  '/mycreations',
  '/userAssets',
  '/me',
  '/dreamup'
];

// Function to check if a URL is from a supported domain and path
export function isSupportedURL(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const isDomainSupported = SUPPORTED_DOMAINS.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );
    
    // Exact matching for paths
    const isPathSupported = SUPPORTED_PATHS.some(path => 
      urlObj.pathname === path || urlObj.pathname.startsWith(path)
    );
    
    // Special cases for specific platforms
    if (urlObj.hostname.includes('firefly.adobe.com') && urlObj.pathname.includes('/files') && urlObj.search.includes('tab=generationHistory')) {
      return true;
    }
    
    // Special case for OpenAI
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
