
import { supabase } from '@/integrations/supabase/client';
import { GalleryImage } from '@/types/gallery';

/**
 * Sync images from extension to the gallery
 * @param images Array of image data to sync to gallery
 * @returns Promise with sync result
 */
export const syncImagesToGallery = async (images: Partial<GalleryImage>[]): Promise<{
  success: boolean;
  count: number;
  errors?: any[];
}> => {
  if (!images || images.length === 0) {
    console.log('No images to sync to gallery');
    return { success: true, count: 0 };
  }
  
  try {
    console.log(`Syncing ${images.length} images to gallery`);
    
    // Check if we have a valid session
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData?.session) {
      console.error('No active session, cannot sync to gallery');
      return { success: false, count: 0, errors: ['No active user session'] };
    }
    
    // Process image data
    const processedImages = images.map(img => ({
      id: img.id || `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: img.url || img.src || '',
      prompt: img.prompt || img.alt || img.title || '',
      platform: img.platform || 'unknown',
      sourceURL: img.sourceURL || img.tabUrl || window.location.href,
      timestamp: img.timestamp || Date.now(),
      type: img.type || 'image',
      user_id: sessionData.session.user.id
    }));
    
    // Insert into IndexedDB for local storage and immediate display
    try {
      const { galleryDB } = await import('@/services/GalleryIndexedDB');
      await galleryDB.init();
      await galleryDB.addImages(processedImages);
      console.log('Successfully stored images in IndexedDB');
    } catch (err) {
      console.error('Error saving to IndexedDB:', err);
      // Continue with Supabase sync even if IndexedDB fails
    }
    
    // Insert into Supabase if available
    try {
      if (supabase) {
        // Use any type assertion to bypass TypeScript errors while table definition is pending
        // This is a temporary fix until the gallery_images table is properly defined in Supabase types
        const { error } = await (supabase as any)
          .from('gallery_images')
          .upsert(
            processedImages.map(img => ({
              ...img,
              user_id: sessionData.session?.user.id
            })),
            { onConflict: 'id' }
          );
        
        if (error) {
          console.error('Error inserting images into Supabase:', error);
          return { success: false, count: 0, errors: [error] };
        }
        
        console.log('Successfully synced images to Supabase');
      }
    } catch (err) {
      console.error('Error in Supabase sync:', err);
      // Fall back to just local storage, don't fail completely
    }
    
    // Send a message to notify extension if we're in that context
    if (typeof window !== 'undefined' && 'chrome' in window) {
      try {
        window.postMessage({
          type: 'GALLERY_IMAGES_SYNCED',
          count: processedImages.length
        }, '*');
      } catch (err) {
        console.error('Error sending sync completion message:', err);
      }
    }
    
    return { success: true, count: processedImages.length };
  } catch (err) {
    console.error('Error in syncImagesToGallery:', err);
    return { success: false, count: 0, errors: [err] };
  }
};

/**
 * Process images received from extension
 * @param imagesData Raw image data from extension
 * @returns Processed gallery image objects
 */
export const processExtensionImages = (imagesData: any[]): GalleryImage[] => {
  if (!imagesData || !Array.isArray(imagesData)) {
    return [];
  }
  
  return imagesData.map(img => ({
    id: img.id || `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    url: img.url || img.src || '',
    prompt: img.prompt || img.alt || img.title || '',
    platform: img.platform || 'unknown',
    sourceURL: img.sourceURL || img.tabUrl || window.location.href,
    timestamp: img.timestamp ? (typeof img.timestamp === 'string' ? new Date(img.timestamp).getTime() : img.timestamp) : Date.now(),
    type: img.type || 'image'
  } as GalleryImage));
};

/**
 * Listen for gallery sync messages from extension
 * @param callback Function to call when images are received
 * @returns Cleanup function
 */
export const listenForGallerySyncMessages = (
  callback: (images: GalleryImage[]) => void
): () => void => {
  const handleMessage = (event: MessageEvent) => {
    // Only process messages from our extension or this window
    if (event.source !== window) return;
    
    if (event.data && event.data.type === 'GALLERY_IMAGES' && Array.isArray(event.data.images)) {
      console.log('Received gallery sync message with images:', event.data.images.length);
      const processedImages = processExtensionImages(event.data.images);
      callback(processedImages);
    }
  };
  
  window.addEventListener('message', handleMessage);
  
  // Notify extension that gallery page is ready for sync
  window.postMessage({
    type: 'GALLERY_PAGE_READY',
    timestamp: Date.now()
  }, '*');
  
  return () => window.removeEventListener('message', handleMessage);
};
