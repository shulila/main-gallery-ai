
import { supabase } from '@/integrations/supabase/client';
import { GalleryImage } from '@/types/gallery';
import { useToast } from '@/hooks/use-toast';

/**
 * Syncs images to the gallery via Supabase
 * @param images Array of gallery images to sync
 * @returns Promise with sync results
 */
export const syncImagesToGallery = async (images: GalleryImage[]) => {
  try {
    if (!images || images.length === 0) {
      return { success: false, count: 0, errors: ['No images to sync'] };
    }
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user, cannot sync images');
      return { success: false, count: 0, errors: ['Not authenticated'] };
    }
    
    // Add user ID to each image
    const imagesWithUser = images.map(img => ({
      ...img,
      user_id: user.id
    }));
    
    // Use type assertion to work around the TypeScript error
    // In a production environment, you should generate proper types from Supabase
    const { data, error } = await (supabase as any)
      .from('gallery_images')
      .upsert(imagesWithUser, { onConflict: 'url', ignoreDuplicates: true });
    
    if (error) {
      console.error('Error syncing images:', error);
      return { success: false, count: 0, errors: [error.message] };
    }
    
    return { success: true, count: imagesWithUser.length, data };
  } catch (error) {
    console.error('Exception syncing images:', error);
    return { 
      success: false, 
      count: 0, 
      errors: [(error as Error).message || 'Unknown error syncing images'] 
    };
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
    id: img.id || `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    url: img.url,
    prompt: img.prompt || '',
    platform: img.platform || 'unknown',
    sourceURL: img.sourceURL || window.location.href,
    timestamp: img.timestamp || Date.now(),
    type: img.type || 'image'
  }));
};

/**
 * Listen for gallery sync messages from extension
 * @param callback Function to call when images are received
 * @returns Cleanup function
 */
export const listenForGallerySyncMessages = (
  callback: (images: GalleryImage[]) => void
): () => void => {
  const messageHandler = (event: MessageEvent) => {
    // Only process messages from this window
    if (event.source !== window) return;
    
    // Only handle gallery image messages
    if (event.data && event.data.type === 'GALLERY_IMAGES') {
      console.log('Received gallery images from extension:', 
                 event.data.images?.length || 0, 'images');
      
      if (event.data.images && Array.isArray(event.data.images)) {
        // Process the images
        const processedImages = processExtensionImages(event.data.images);
        
        // Call the callback with the processed images
        callback(processedImages);
        
        // Confirm receipt
        window.postMessage({
          type: 'GALLERY_IMAGES_RECEIVED',
          count: processedImages.length,
          timestamp: Date.now()
        }, '*');
      }
    }
    
    // Handle bridge ready message
    if (event.data && event.data.type === 'EXTENSION_BRIDGE_READY') {
      console.log('Extension bridge is ready, sending ready message');
      
      // Notify the bridge that the gallery page is ready
      window.postMessage({
        type: 'GALLERY_PAGE_READY',
        url: window.location.href,
        timestamp: Date.now()
      }, '*');
    }
  };
  
  // Add the message listener
  window.addEventListener('message', messageHandler);
  
  // Send ready message in case bridge is already listening
  setTimeout(() => {
    window.postMessage({
      type: 'GALLERY_PAGE_READY',
      url: window.location.href,
      timestamp: Date.now()
    }, '*');
  }, 1000);
  
  // Return a cleanup function
  return () => {
    window.removeEventListener('message', messageHandler);
  };
};

/**
 * Note: To properly fix the TypeScript errors in this file, 
 * you need to create the gallery_images table in Supabase and 
 * generate updated types using the Supabase CLI:
 * 
 * 1. Install Supabase CLI
 * 2. Run: supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
 * 3. Import and use the generated types
 */
