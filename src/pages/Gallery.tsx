
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { supabase } from '@/integrations/supabase/client';

const Gallery = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [syncedImages, setSyncedImages] = useState<GalleryImage[]>([]);
  const [isExtensionSync, setIsExtensionSync] = useState(false);
  const [scanModeActive, setScanModeActive] = useState(false);
  const [forceEmptyState, setForceEmptyState] = useState(false);
  const [isLoadingImages, setIsLoadingImages] = useState(true);
  
  // Check authentication on load
  useEffect(() => {
    const checkAuth = async () => {
      console.log('[MainGallery] Gallery page - checking auth status');
      
      // Get current session directly from Supabase
      const { data } = await supabase.auth.getSession();
      const isAuthenticated = !!data.session;
      
      console.log('[MainGallery] Gallery page - auth status:', isAuthenticated ? 'Authenticated' : 'Not authenticated');
      
      if (!isAuthenticated && !isLoading) {
        console.log('[MainGallery] Gallery page - redirecting to auth page due to no session');
        navigate('/auth');
      }
    };
    
    checkAuth();
  }, []);
  
  useEffect(() => {
    const stateParam = searchParams.get('state');
    if (stateParam === 'empty') {
      setForceEmptyState(true);
      
      setScanModeActive(true);
      
      sessionStorage.setItem('scanMode', 'active');
      
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, [searchParams]);
  
  useEffect(() => {
    const processExtensionImages = async (images: GalleryImage[]) => {
      console.log(`[MainGallery] Received ${images.length} images from extension`);
      
      if (!images || images.length === 0) return;
      
      setIsExtensionSync(true);
      
      setSyncedImages(prev => {
        const combined = [...images, ...prev];
        const unique = combined.filter((item, index, self) => 
          index === self.findIndex(i => i.url === item.url)
        );
        return sortGalleryImages(unique);
      });
      
      setForceEmptyState(false);
      
      try {
        await galleryDB.init();
        await galleryDB.addImages(images);
        console.log(`[MainGallery] Stored ${images.length} images in IndexedDB`);
        
        const syncResult = await syncImagesToGallery(images);
        
        if (syncResult.success) {
          toast({
            title: "Images Synced",
            description: `${images.length} images added to your gallery`,
            duration: 3000,
          });
          
          window.postMessage({
            type: 'GALLERY_HAS_IMAGES',
            hasImages: true
          }, '*');
        } else {
          console.error('[MainGallery] Error syncing to backend:', syncResult.errors);
        }
        
        window.postMessage({
          type: 'GALLERY_IMAGES_RECEIVED',
          count: images.length
        }, '*');
      } catch (error) {
        console.error('[MainGallery] Error processing extension images:', error);
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
    
    const cleanup = listenForGallerySyncMessages(processExtensionImages);
    
    const loadExistingImages = async () => {
      try {
        setIsLoadingImages(true);
        await galleryDB.init();
        const images = await galleryDB.getAllImages();
        console.log(`[MainGallery] Loaded ${images.length} existing images from IndexedDB`);
        
        // Sort images by creation date if available, or timestamp
        const sortedImages = sortGalleryImages(images);
        setSyncedImages(sortedImages);
        
        if (images.length > 0 && !forceEmptyState) {
          window.postMessage({
            type: 'GALLERY_HAS_IMAGES',
            hasImages: true
          }, '*');
        }
      } catch (error) {
        console.error('[MainGallery] Error loading images from IndexedDB:', error);
      } finally {
        setIsLoadingImages(false);
      }
    };
    
    loadExistingImages();
    
    const urlParams = new URLSearchParams(window.location.search);
    const syncRequested = urlParams.get('sync') === 'true';
    
    if (syncRequested) {
      console.log('[MainGallery] Sync requested via URL parameter, notifying extension');
      window.postMessage({
        type: 'WEB_APP_TO_EXTENSION',
        action: 'readyForSync'
      }, '*');
      
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
    
    const pendingSyncStr = sessionStorage.getItem('maingallery_sync_images');
    if (pendingSyncStr) {
      try {
        const pendingImages = JSON.parse(pendingSyncStr);
        console.log('[MainGallery] Found pending sync images in session storage:', pendingImages.length);
        if (Array.isArray(pendingImages) && pendingImages.length > 0) {
          processExtensionImages(pendingImages);
        }
        sessionStorage.removeItem('maingallery_sync_images');
      } catch (e) {
        console.error('[MainGallery] Error processing pending sync images:', e);
      }
    }
    
    const scanMode = sessionStorage.getItem('scanMode');
    if (scanMode === 'active') {
      setScanModeActive(true);
      sessionStorage.removeItem('scanMode');
    }
    
    const fromExtension = urlParams.get('from') === 'extension';
    if (fromExtension) {
      toast({
        title: "Extension Connected",
        description: "MainGallery extension is ready to sync images",
        duration: 3000,
      });
    }
    
    return cleanup;
  }, [toast, forceEmptyState]);
  
  useEffect(() => {
    if (!isLoading && !user) {
      console.log('[MainGallery] No user in context, redirecting to auth page');
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Sort gallery images function
  const sortGalleryImages = (images: GalleryImage[]): GalleryImage[] => {
    return [...images].sort((a, b) => {
      // Use createdAt if available, otherwise use timestamp
      const dateA = a.createdAt ? new Date(a.createdAt) : (a.timestamp ? new Date(a.timestamp) : new Date(0));
      const dateB = b.createdAt ? new Date(b.createdAt) : (b.timestamp ? new Date(b.timestamp) : new Date(0));
      
      // Sort descending (newest first)
      return dateB.getTime() - dateA.getTime();
    });
  };

  const handleAddGalleryClick = () => {
    document.body.style.cursor = 'crosshair';
    sessionStorage.setItem('scanMode', 'active');
    setScanModeActive(true);
    toast({
      title: "Switch to a Supported Tab",
      description: "Please switch to a supported platform tab (e.g. Midjourney) to start scanning for images.",
      duration: 5000,
    });
  };

  if (isLoading || isLoadingImages) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const shouldShowEmptyState = () => {
    return (forceEmptyState || syncedImages.length === 0) && !isLoadingImages;
  };

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
        {shouldShowEmptyState() ? (
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
