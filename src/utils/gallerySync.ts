
import { supabase } from '@/integrations/supabase/client';
import { GalleryImage } from '@/types/gallery';
import { useToast } from '@/hooks/use-toast';

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
        // We need to use type assertion until the proper Supabase types are generated
        // This will be fixed once the gallery_images table is properly defined in Supabase
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

/**
 * Scan a page by scrolling to load lazy-loaded images and then extract all gallery images
 * @param scrollDelay Milliseconds to wait between scroll actions
 * @param scrollStep Pixels to scroll each step
 * @returns Promise with extracted images
 */
export const scanPageWithAutoScroll = async (
  scrollDelay = 500, 
  scrollStep = 800
): Promise<GalleryImage[]> => {
  return new Promise((resolve) => {
    const images: GalleryImage[] = [];
    const extractedUrls = new Set<string>();
    
    // Function to extract images from the current view
    const extractCurrentImages = () => {
      // Select all image elements in the page
      const imgElements = document.querySelectorAll('img[src]:not([src=""])');
      
      imgElements.forEach(img => {
        const src = img.getAttribute('src') || '';
        
        // Skip if already extracted or too small (likely icons)
        if (extractedUrls.has(src) || !src || src.startsWith('data:') || 
            (img.width < 200 && img.height < 200)) {
          return;
        }
        
        // Extract image data
        const alt = img.getAttribute('alt') || '';
        const title = img.getAttribute('title') || '';
        const parentNode = img.parentElement;
        let prompt = alt || title || '';
        
        // Try to find prompt in parent elements (common in gallery sites)
        if (!prompt && parentNode) {
          const promptElement = parentNode.querySelector('.prompt, [data-prompt], .caption, .description');
          if (promptElement) {
            prompt = promptElement.textContent || '';
          }
        }
        
        // Extract the platform name from URL or document title
        const platformHint = document.title.toLowerCase();
        let platform = 'unknown';
        
        if (window.location.hostname.includes('midjourney')) {
          platform = 'midjourney';
        } else if (window.location.hostname.includes('leonardo') || 
                  window.location.hostname.includes('dreamstudio') || 
                  platformHint.includes('leonardo')) {
          platform = 'leonardo';
        } else if (window.location.hostname.includes('openai') || 
                  window.location.hostname.includes('dall-e') || 
                  platformHint.includes('dall-e')) {
          platform = 'dalle';
        } else if (window.location.hostname.includes('stability') || 
                  platformHint.includes('stability')) {
          platform = 'stability';
        } else if (window.location.hostname.includes('pika') || 
                  platformHint.includes('pika')) {
          platform = 'pika';
        } else if (window.location.hostname.includes('runway') || 
                  platformHint.includes('runway')) {
          platform = 'runway';
        }
        
        // Add to results and mark as processed
        images.push({
          id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          url: src,
          prompt: prompt.trim(),
          platform: platform,
          sourceURL: window.location.href,
          timestamp: Date.now(),
          type: 'image'
        } as GalleryImage);
        
        extractedUrls.add(src);
      });
      
      console.log(`Found ${images.length} images so far (${extractedUrls.size} unique).`);
    };
    
    // Get initial images before scrolling
    extractCurrentImages();
    
    const maxScrollAttempts = 30; // Prevent infinite scrolling
    let scrollAttempts = 0;
    let previousHeight = 0;
    
    // Start scrolling process
    const scrollAndExtract = () => {
      // Get current scroll position and document height
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
      
      // Check if we've reached bottom or made too many attempts
      if (scrollTop + window.innerHeight >= scrollHeight - 200 || 
          scrollAttempts >= maxScrollAttempts ||
          (scrollHeight === previousHeight && scrollAttempts > 5)) {
        
        // Final extraction to make sure we got everything
        extractCurrentImages();
        
        console.log(`Scrolling complete. Found ${images.length} images total.`);
        resolve(images);
        return;
      }
      
      // Scroll down
      window.scrollBy({
        top: scrollStep,
        behavior: 'smooth'
      });
      
      // Update counters
      scrollAttempts++;
      previousHeight = scrollHeight;
      
      // Wait and then extract new images that may have loaded
      setTimeout(() => {
        extractCurrentImages();
        
        // Continue scrolling
        setTimeout(scrollAndExtract, scrollDelay);
      }, scrollDelay);
    };
    
    // Start the scrolling process
    setTimeout(scrollAndExtract, scrollDelay);
  });
};
