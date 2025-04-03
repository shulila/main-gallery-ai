
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import GalleryView from '@/components/GalleryView';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { galleryDB } from '@/services/GalleryIndexedDB';
import { GalleryImage } from '@/types/gallery';
import { listenForGallerySyncMessages, syncImagesToGallery } from '@/utils/gallerySync';
import { Button } from '@/components/ui/button';
import { ImageIcon, ArrowRight } from 'lucide-react';

const Gallery = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [syncedImages, setSyncedImages] = useState<GalleryImage[]>([]);
  const [isExtensionSync, setIsExtensionSync] = useState(false);
  const [scanModeActive, setScanModeActive] = useState(false);
  
  // Handle extension messages and image syncing
  useEffect(() => {
    // Function to process images from extension
    const processExtensionImages = async (images: GalleryImage[]) => {
      console.log(`Received ${images.length} images from extension`);
      
      if (!images || images.length === 0) return;
      
      setIsExtensionSync(true);
      
      // Update state with new images
      setSyncedImages(prev => {
        // Combine and deduplicate
        const combined = [...images, ...prev];
        const unique = combined.filter((item, index, self) => 
          index === self.findIndex(i => i.url === item.url)
        );
        return unique;
      });
      
      // Store in IndexedDB and sync to backend
      try {
        await galleryDB.init();
        await galleryDB.addImages(images);
        console.log(`Stored ${images.length} images in IndexedDB`);
        
        // Sync to backend if available
        const syncResult = await syncImagesToGallery(images);
        
        if (syncResult.success) {
          // Show toast notification
          toast({
            title: "Images Synced",
            description: `${images.length} images added to your gallery`,
            duration: 3000,
          });
        } else {
          console.error('Error syncing to backend:', syncResult.errors);
        }
        
        // Send confirmation back to extension
        window.postMessage({
          type: 'GALLERY_IMAGES_RECEIVED',
          count: images.length
        }, '*');
      } catch (error) {
        console.error('Error processing extension images:', error);
        toast({
          title: "Sync Error",
          description: "There was an error saving the images",
          variant: "destructive"
        });
      }
      
      setTimeout(() => {
        setIsExtensionSync(false);
      }, 3000);
    };
    
    // Set up listener for gallery sync messages
    const cleanup = listenForGallerySyncMessages(processExtensionImages);
    
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
    
    // Check for pending sync data in sessionStorage (from previous auth flow)
    const pendingSyncStr = sessionStorage.getItem('maingallery_sync_images');
    if (pendingSyncStr) {
      try {
        const pendingImages = JSON.parse(pendingSyncStr);
        console.log('Found pending sync images in session storage:', pendingImages.length);
        if (Array.isArray(pendingImages) && pendingImages.length > 0) {
          processExtensionImages(pendingImages);
        }
        // Clear the pending sync data
        sessionStorage.removeItem('maingallery_sync_images');
      } catch (e) {
        console.error('Error processing pending sync images:', e);
      }
    }
    
    // Check for scan mode from sessionStorage
    const scanMode = sessionStorage.getItem('scanMode');
    if (scanMode === 'active') {
      setScanModeActive(true);
      sessionStorage.removeItem('scanMode');
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
    
    return cleanup;
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

  const handleAddGalleryClick = () => {
    // Change cursor to indicate "select supported tab" mode
    document.body.style.cursor = 'crosshair';
    
    // Set scan mode in session storage
    sessionStorage.setItem('scanMode', 'active');
    setScanModeActive(true);
    
    // Show toast with instructions
    toast({
      title: "Switch to a Supported Tab",
      description: "Please switch to a supported platform tab (e.g. Midjourney) to start scanning for images.",
      duration: 5000,
    });
  };

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

  // Empty state UI when no images are present
  const EmptyGalleryState = () => (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="mb-6 text-muted-foreground">
        <ImageIcon className="h-20 w-20 mx-auto opacity-30" />
      </div>
      <h2 className="text-2xl font-bold mb-3">Your Gallery is Empty</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        Start by adding AI-generated images from supported platforms like Midjourney, DALL-E, and more.
      </p>
      <Button 
        size="lg" 
        onClick={handleAddGalleryClick}
        className="text-lg py-6 px-8"
      >
        Add to Gallery
        <ArrowRight className="ml-2" />
      </Button>
      
      {scanModeActive && (
        <div className="mt-8 p-4 bg-muted/30 rounded-lg border border-border">
          <p className="font-medium">Scan Mode Active</p>
          <p className="text-sm text-muted-foreground">
            Switch to a supported AI platform tab to automatically scan for images
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24">
        {syncedImages.length === 0 ? (
          <EmptyGalleryState />
        ) : (
          <GalleryView images={syncedImages} isNewSync={isExtensionSync} />
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Gallery;
