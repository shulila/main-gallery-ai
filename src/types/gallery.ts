
/**
 * Type definitions for gallery images
 * This file centralizes all gallery-related type definitions
 */

/**
 * Base interface for gallery images with required properties
 */
export interface BaseGalleryImage {
  id: string;
  url: string;
  sourceURL: string;
  timestamp: number;
  createdAt: string;
}

/**
 * Extended interface with optional properties
 */
export interface GalleryImage extends BaseGalleryImage {
  // Image metadata
  src?: string;
  prompt?: string;
  alt?: string;
  title?: string;
  platform?: string;
  model?: string;
  seed?: string;
  status?: string;
  
  // Platform-specific metadata
  platformName?: string;
  favicon?: string;
  tabUrl?: string;
  tabTitle?: string;
  
  // Image dimensions
  naturalWidth?: number;
  naturalHeight?: number;
  
  // Source information
  domain?: string;
  path?: string;
  pageTitle?: string;
  
  // Flags
  fromSupportedDomain?: boolean;
  
  // Identification
  imageHash?: string;
  type?: string;
}

/**
 * Interface for gallery filter options
 */
export interface GalleryFilterOptions {
  platform?: string | null;
  dateRange?: DateRangeFilter | null;
  searchTerm?: string | null;
  modelType?: string | null;
}

/**
 * Interface for date range filter
 */
export interface DateRangeFilter {
  startDate: Date;
  endDate: Date;
}

/**
 * Interface for gallery pagination options
 */
export interface GalleryPaginationOptions {
  page: number;
  pageSize: number;
}

/**
 * Interface for gallery sort options
 */
export type GallerySortField = 'timestamp' | 'title' | 'platform';
export type SortDirection = 'asc' | 'desc';

export interface GallerySortOptions {
  field: GallerySortField;
  direction: SortDirection;
}

/**
 * Interface for gallery statistics
 */
export interface GalleryStats {
  totalImages: number;
  uniquePlatforms: number;
  platformsList: string[];
  approximateSizeMB: number;
}

/**
 * Enum for supported platforms
 */
export enum SupportedPlatform {
  MIDJOURNEY = 'Midjourney',
  DALLE = 'DALL-E',
  LEONARDO = 'Leonardo',
  RUNWAY = 'Runway',
  PIKA = 'Pika',
  KREA = 'Krea',
  FIREFLY = 'Firefly',
  SORA = 'Sora'
  // Add all 53 platforms here
}

/**
 * Type guard to check if a value is a GalleryImage
 */
export function isGalleryImage(value: unknown): value is GalleryImage {
  if (!value || typeof value !== 'object') return false;
  
  const image = value as Partial<GalleryImage>;
  
  return (
    typeof image.id === 'string' &&
    typeof image.url === 'string' &&
    typeof image.sourceURL === 'string' &&
    typeof image.timestamp === 'number' &&
    typeof image.createdAt === 'string'
  );
}

/**
 * Updated list of supported domains for auto-sync
 */
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

/**
 * List of supported paths/routes that are gallery or creation pages
 */
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

/**
 * Function to check if a URL is from a supported domain and path
 */
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
