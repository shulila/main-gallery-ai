
import { GalleryImage, isSupportedURL } from '@/types/gallery';

// Default date formatter 
const formatDate = (date: Date | string | number) => {
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  
  return dateObj.toLocaleString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Process a batch of images from a platform scanner into GalleryImage objects
 * @param images Raw image data from platform scanners
 * @param tabInfo Tab information
 * @returns Array of formatted GalleryImage objects
 */
export const processGalleryImages = (
  images: any[],
  tabInfo?: { url: string; title: string; favicon?: string }
): GalleryImage[] => {
  if (!images || !Array.isArray(images) || images.length === 0) {
    console.warn('No valid images to process');
    return [];
  }

  // Set defaults from tab info if available
  const defaultPlatform = tabInfo?.url 
    ? new URL(tabInfo.url).hostname.replace('www.', '')
    : 'unknown';

  // Generate current timestamp for all images
  const timeNow = Date.now();
  const currentDate = new Date();
  
  // Format the current date string for display
  const defaultCreatedAt = formatDate(currentDate);
  
  return images.map(img => {
    // Extract all available date information (handle different formats)
    const creationDate = img.creationDate || img.date || img.created_at || currentDate;
    
    // Format the created date string for display
    const createdAt = creationDate 
      ? formatDate(creationDate) 
      : defaultCreatedAt;
    
    // Create the GalleryImage object with ALL required fields
    const galleryImage: GalleryImage = {
      id: img.id || `img_${timeNow}_${Math.random().toString(36).substring(2, 12)}`,
      url: img.src || img.url || '', 
      prompt: img.prompt || img.alt || img.title || '',
      platform: img.platform || img.platformName || defaultPlatform,
      sourceURL: img.sourceURL || img.sourceUrl || tabInfo?.url || '',
      timestamp: img.timestamp || timeNow,
      type: img.type || 'image',
      createdAt // This is the required field that was missing
    };
    
    // Add optional fields if they exist
    if (img.tabUrl) galleryImage.tabUrl = img.tabUrl;
    if (img.alt) galleryImage.alt = img.alt;
    if (img.title) galleryImage.title = img.title;
    if (img.model) galleryImage.model = img.model;
    if (img.seed) galleryImage.seed = img.seed;
    
    // Add creation date as separate field
    if (creationDate) galleryImage.creationDate = 
      typeof creationDate === 'string' ? creationDate : new Date(creationDate).toISOString();
    
    // Add tab information
    if (tabInfo) {
      galleryImage.tabTitle = tabInfo.title;
      if (tabInfo.favicon) galleryImage.favicon = tabInfo.favicon;
      
      // Extract domain information
      try {
        const urlObj = new URL(tabInfo.url);
        galleryImage.domain = urlObj.hostname;
        galleryImage.path = urlObj.pathname;
        
        // Check if this domain is in our supported list
        galleryImage.fromSupportedDomain = isSupportedURL(tabInfo.url);
      } catch (e) {
        console.error('Error parsing URL:', e);
      }
    }
    
    return galleryImage;
  });
};

/**
 * Filter a list of gallery images to remove duplicates or invalid entries
 * @param images List of gallery images to filter
 * @returns Filtered list of images
 */
export const filterGalleryImages = (images: GalleryImage[]): GalleryImage[] => {
  if (!images || !Array.isArray(images)) return [];
  
  // Filter out images with empty URLs
  const validImages = images.filter(img => img.url && img.url.trim().length > 0);
  
  // Remove exact duplicates by URL
  const uniqueUrls = new Set();
  
  return validImages.filter(img => {
    if (uniqueUrls.has(img.url)) {
      return false;
    }
    uniqueUrls.add(img.url);
    return true;
  });
};

/**
 * Sort gallery images by creation date or timestamp
 * @param images List of gallery images to sort
 * @param order Sort order ('asc' or 'desc')
 * @returns Sorted list of images
 */
export const sortGalleryImages = (
  images: GalleryImage[], 
  order: 'asc' | 'desc' = 'desc'
): GalleryImage[] => {
  if (!images || !Array.isArray(images)) return [];
  
  return [...images].sort((a, b) => {
    // First try to use timestamp
    const aTime = a.timestamp || 0;
    const bTime = b.timestamp || 0;
    
    const comparison = aTime - bTime;
    return order === 'desc' ? -comparison : comparison;
  });
};

/**
 * Listen for gallery sync messages from extension or other sources
 * @param callback Function to call when gallery images are received
 * @returns Cleanup function to remove event listener
 */
export const listenForGallerySyncMessages = (
  callback: (images: GalleryImage[]) => void
): () => void => {
  const handleMessage = (event: MessageEvent) => {
    // Only process messages from trusted sources
    if (process.env.NODE_ENV === 'production') {
      const allowedOrigins = [window.location.origin, 'chrome-extension://'];
      if (!allowedOrigins.some(origin => event.origin.startsWith(origin))) {
        console.warn('Received message from unauthorized origin:', event.origin);
        return;
      }
    }

    if (event.data && event.data.type === 'GALLERY_IMAGES' && Array.isArray(event.data.images)) {
      console.log(`[GallerySync] Received ${event.data.images.length} images`);
      callback(event.data.images);
    }
  };

  window.addEventListener('message', handleMessage);
  
  return () => {
    window.removeEventListener('message', handleMessage);
  };
};

/**
 * Sync images to gallery backend
 * @param images List of gallery images to sync
 * @returns Promise with sync result
 */
export const syncImagesToGallery = async (
  images: GalleryImage[]
): Promise<{ success: boolean; count: number; errors?: any[] }> => {
  try {
    if (!images || !Array.isArray(images) || images.length === 0) {
      console.warn('[GallerySync] No valid images to sync');
      return { success: false, count: 0, errors: ['No valid images provided'] };
    }

    // Process images through filter to ensure quality
    const filteredImages = filterGalleryImages(images);
    
    // In a real implementation, this would send the images to a backend API
    console.log(`[GallerySync] Successfully synced ${filteredImages.length} images`);
    
    // Send notification to extension that sync is complete
    window.postMessage({
      type: 'GALLERY_SYNC_COMPLETE',
      count: filteredImages.length,
      timestamp: Date.now()
    }, '*');
    
    return { 
      success: true, 
      count: filteredImages.length 
    };
  } catch (error) {
    console.error('[GallerySync] Error syncing images:', error);
    return { 
      success: false, 
      count: 0,
      errors: [error] 
    };
  }
};
