import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import GalleryView from '@/components/GalleryView';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { galleryDB } from '@/services/GalleryIndexedDB';

// Define GalleryImage type
type GalleryImage = {
  id?: string;
  url: string;
  src?: string; // For compatibility with extension data
  prompt?: string;
  alt?: string; // Add missing property used in code
  title?: string; // Add missing property used in code
  platform?: string;
  creationDate?: string;
  sourceURL: string;
  tabUrl?: string; // Add missing property used in code
  timestamp?: number;
  type?: string;
};

const Gallery = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [syncedImages, setSyncedImages] = useState<GalleryImage[]>([]);
  
  // Handle extension messages
  useEffect(() => {
    // Function to process images from extension
    const processExtensionImages = async (images: GalleryImage[]) => {
      console.log(`Received ${images.length} images from extension`);
      
      if (!images || images.length === 0) return;
      
      // Process and format the incoming images
      const processedImages = images.map(img => ({
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: img.src || img.url || '',
        prompt: img.prompt || img.alt || img.title || '',
        platform: img.platform || 'unknown',
        sourceURL: img.sourceURL || img.tabUrl || window.location.href,
        timestamp: img.timestamp ? (typeof img.timestamp === 'string' ? new Date(img.timestamp).getTime() : img.timestamp) : Date.now(),
        type: img.type || 'image'
      }));
      
      // Update state with new images
      setSyncedImages(prev => {
        // Combine and deduplicate
        const combined = [...processedImages, ...prev];
        const unique = combined.filter((item, index, self) => 
          index === self.findIndex(i => i.url === item.url)
        );
        return unique;
      });
      
      // Store in IndexedDB
      try {
        await galleryDB.init();
        await galleryDB.addImages(processedImages);
        console.log(`Stored ${processedImages.length} images in IndexedDB`);
        
        // Show toast notification
        toast({
          title: "Images Synced",
          description: `${processedImages.length} images added to your gallery`,
          duration: 3000,
        });
        
        // Send confirmation back to extension
        window.postMessage({
          type: 'GALLERY_IMAGES_RECEIVED',
          count: processedImages.length
        }, '*');
      } catch (error) {
        console.error('Error storing images in IndexedDB:', error);
        toast({
          title: "Sync Error",
          description: "There was an error saving the images",
          variant: "destructive"
        });
      }
    };
    
    // Listen for extension messages
    const handleExtensionMessage = (event: MessageEvent) => {
      // Security check
      if (event.source !== window) return;
      
      // Check for gallery images from extension
      if (event.data && event.data.type === 'GALLERY_IMAGES' && event.data.images) {
        processExtensionImages(event.data.images);
      }
    };
    
    // Add message listener
    window.addEventListener('message', handleExtensionMessage);
    
    // Notify bridge that page is ready
    window.postMessage({
      type: 'GALLERY_PAGE_READY',
      timestamp: Date.now()
    }, '*');
    
    // Load existing images from IndexedDB
    const loadExistingImages = async () => {
      try {
        await galleryDB.init();
        const images = await galleryDB.getAllImages();
        console.log(`Loaded ${images.length} existing images from IndexedDB`);
        setSyncedImages(images);
      } catch (error) {
        console.error('Error loading images from IndexedDB:', error);
      }
    };
    
    loadExistingImages();
    
    // Check if there was a sync request in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const syncRequested = urlParams.get('sync') === 'true';
    
    if (syncRequested) {
      console.log('Sync requested via URL parameter, notifying extension');
      // Notify the extension that we're ready for the images
      window.postMessage({
        type: 'WEB_APP_TO_EXTENSION',
        action: 'readyForSync'
      }, '*');
      
      // Clean up the URL by removing the sync parameter
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
    
    // Extension connection notification
    const fromExtension = urlParams.get('from') === 'extension';
    if (fromExtension) {
      toast({
        title: "Extension Connected",
        description: "MainGallery extension is ready to sync images",
        duration: 3000,
      });
    }
    
    return () => {
      // Clean up
      window.removeEventListener('message', handleExtensionMessage);
    };
  }, [toast]);
  
  // Redirect to auth page if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via the useEffect
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24">
        <GalleryView images={syncedImages} />
      </main>
      <Footer />
    </div>
  );
};

export default Gallery;
