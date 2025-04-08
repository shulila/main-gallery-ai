
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ImageCard } from './ImageCard';
import { Button } from "@/components/ui/button";
import { Grid, Columns, Calendar, Filter, ChevronDown, ImageIcon, Download, Copy, ExternalLink, FileJson, RefreshCw } from 'lucide-react';
import { galleryDB } from '@/services/GalleryIndexedDB';
import { useToast } from "@/hooks/use-toast";
import { GalleryImage } from '@/types/gallery';

type ViewMode = 'grid' | 'columns';
type SortOption = 'newest' | 'oldest' | 'platform';
type FilterOption = 'all' | 'midjourney' | 'dalle' | 'stable-diffusion' | 'runway' | 'pika';

interface GalleryViewProps {
  images?: GalleryImage[];
  isNewSync?: boolean;
}

const GalleryView = ({ images: externalImages, isNewSync = false }: GalleryViewProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterPlatforms, setFilterPlatforms] = useState<boolean>(false);
  const [exportDialogOpen, setExportDialogOpen] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleExtensionMessage = (event: MessageEvent) => {
      console.log('Received message event in GalleryView:', event.origin, event.data?.type);
      
      if (process.env.NODE_ENV === 'production') {
        const allowedOrigins = [window.location.origin, 'chrome-extension://'];
        if (!allowedOrigins.some(origin => event.origin.startsWith(origin))) {
          console.warn('Received message from unauthorized origin:', event.origin);
          return;
        }
      }
  
      if (event.data && event.data.type === 'GALLERY_IMAGES') {
        console.log('✅ Received gallery images from extension:', event.data.images?.length);
        console.log('Sample image data:', event.data.images?.[0]);
        
        if (event.data.images && Array.isArray(event.data.images) && event.data.images.length > 0) {
          processIncomingImages(event.data.images);
          
          // Send confirmation back to extension
          window.postMessage({
            type: 'GALLERY_IMAGES_RECEIVED',
            count: event.data.images.length,
            success: true
          }, '*');
        } else {
          console.warn('Invalid or empty images data received:', event.data);
        }
      }
      
      if (event.data && event.data.type === 'EXTENSION_BRIDGE_READY') {
        console.log('Extension bridge announced its presence');
        
        // Check if we have pending images in session storage
        const pendingImagesJSON = sessionStorage.getItem('maingallery_sync_images');
        if (pendingImagesJSON) {
          try {
            const pendingImages = JSON.parse(pendingImagesJSON);
            console.log(`Found ${pendingImages.length} pending images in session storage`);
            processIncomingImages(pendingImages);
            sessionStorage.removeItem('maingallery_sync_images');
          } catch (err) {
            console.error('Error processing pending images:', err);
          }
        }
      }
    };
  
    window.addEventListener('message', handleExtensionMessage);
    
    return () => {
      window.removeEventListener('message', handleExtensionMessage);
    };
  }, []);

  const processIncomingImages = async (incomingImages: any[]) => {
    if (!incomingImages || !Array.isArray(incomingImages) || incomingImages.length === 0) {
      console.warn('No valid images received');
      return;
    }

    try {
      console.log('Processing incoming images:', incomingImages.length);
      
      const formattedImages: GalleryImage[] = incomingImages.map((img) => {
        // Format the creation date or use current date as fallback
        const creationDate = img.creationDate || new Date().toISOString();
        // Format for display (createdAt needs to be a string)
        const createdAt = new Date(creationDate).toLocaleString();
        
        return {
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          url: img.src || img.url || '',
          prompt: img.prompt || img.alt || img.title || '',
          platform: img.platform || img.platformName || 'unknown',
          creationDate, // Store the original date
          sourceURL: img.tabUrl || img.sourceUrl || window.location.href,
          timestamp: img.timestamp || Date.now(),
          createdAt // Add the required createdAt field
        };
      });

      const validImages = formattedImages.filter(img => img.url && img.url.length > 0);
      
      if (validImages.length === 0) {
        toast({
          title: "No valid images found",
          description: "The received data didn't contain any valid image URLs.",
          variant: "destructive",
        });
        return;
      }

      console.log(`Adding ${validImages.length} images to IndexedDB`);
      await galleryDB.addImages(validImages);
      
      setImages(prevImages => {
        const existingUrls = new Set(prevImages.map(img => img.url));
        const uniqueImages = validImages.filter(img => !existingUrls.has(img.url));
        console.log(`Adding ${uniqueImages.length} unique images to state`);
        return [...uniqueImages, ...prevImages];
      });

      toast({
        title: "Images synced successfully",
        description: `Added ${validImages.length} new images to your gallery.`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error processing incoming images:', error);
      toast({
        title: "Error syncing images",
        description: "Failed to process incoming images. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const loadImagesFromDB = async () => {
      try {
        setIsLoading(true);
        await galleryDB.init();
        
        const dbImages = await galleryDB.getAllImages();
        console.log(`Loaded ${dbImages.length} images from IndexedDB`);
        
        if (dbImages.length > 0) {
          setImages(dbImages);
        }
        // Remove the mock data usage in production and when images exist
      } catch (error) {
        console.error('Error loading images from IndexedDB:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadImagesFromDB();
    
    const pendingImagesJSON = sessionStorage.getItem('maingallery_sync_images');
    if (pendingImagesJSON) {
      try {
        const pendingImages = JSON.parse(pendingImagesJSON);
        console.log(`Found ${pendingImages.length} pending images in session storage`);
        processIncomingImages(pendingImages);
        sessionStorage.removeItem('maingallery_sync_images');
      } catch (err) {
        console.error('Error processing pending images from session storage:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (externalImages && externalImages.length > 0) {
      setImages(prevImages => {
        const combined = [...externalImages, ...prevImages];
        const unique = combined.filter((item, index, self) => 
          index === self.findIndex(i => i.url === item.url)
        );
        return unique;
      });
    }
  }, [externalImages]);

  useEffect(() => {
    if (isLoading) return;
    
    let filteredImages = [...images];
    
    if (filterBy !== 'all') {
      filteredImages = filteredImages.filter(img => {
        const platform = img.platform?.toLowerCase().replace(/·/g, '').replace(/\s/g, '-');
        return platform === filterBy;
      });
    }
    
    filteredImages.sort((a, b) => {
      if (sortBy === 'newest') {
        return (b.timestamp || 0) - (a.timestamp || 0);
      } else if (sortBy === 'oldest') {
        return (a.timestamp || 0) - (b.timestamp || 0);
      } else if (sortBy === 'platform') {
        return (a.platform || '').localeCompare(b.platform || '');
      }
      return 0;
    });
    
    setImages(filteredImages);
  }, [sortBy, filterBy]);

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast({
      title: "Prompt copied",
      description: "The prompt has been copied to your clipboard.",
      duration: 2000,
    });
  };

  const handleOpenSource = (sourceURL: string) => {
    window.open(sourceURL, '_blank');
  };

  const handleDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'image';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  const handleExportGallery = () => {
    try {
      const exportData = images.map(img => ({
        id: img.id,
        url: img.url,
        prompt: img.prompt || '',
        platform: img.platform || '',
        creationDate: img.creationDate || '',
        sourceURL: img.sourceURL,
        timestamp: img.timestamp
      }));
      
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `maingallery-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Gallery exported successfully",
        description: `Exported ${exportData.length} images to JSON file.`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Error exporting gallery:', error);
      toast({
        title: "Export failed",
        description: "Could not export gallery data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const platforms = [
    { id: 'all', name: 'All Platforms' },
    { id: 'midjourney', name: 'Midjourney' },
    { id: 'dalle', name: 'DALL·E' },
    { id: 'stable-diffusion', name: 'Stable Diffusion' },
    { id: 'runway', name: 'Runway' },
    { id: 'pika', name: 'Pika' }
  ];

  const sortOptions = [
    { id: 'newest', name: 'Newest First' },
    { id: 'oldest', name: 'Oldest First' },
    { id: 'platform', name: 'By Platform' }
  ];

  if (images.length === 0 && !isLoading) {
    return null; // Return null for empty gallery - the parent component will show the empty state
  }

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <h2 className="text-2xl font-bold mb-4 md:mb-0">Your Gallery</h2>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative group">
              <Button variant="outline" className="w-full sm:w-auto flex items-center justify-between">
                <Filter className="h-4 w-4 mr-2" />
                {platforms.find(p => p.id === filterBy)?.name}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
              <div className="absolute right-0 mt-2 w-48 bg-background rounded-md shadow-lg border border-border z-10 hidden group-hover:block">
                {platforms.map(platform => (
                  <button
                    key={platform.id}
                    className="block w-full text-left px-4 py-2 hover:bg-secondary"
                    onClick={() => setFilterBy(platform.id as FilterOption)}
                  >
                    {platform.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="relative group">
              <Button variant="outline" className="w-full sm:w-auto flex items-center justify-between">
                <Calendar className="h-4 w-4 mr-2" />
                {sortOptions.find(s => s.id === sortBy)?.name}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
              <div className="absolute right-0 mt-2 w-48 bg-background rounded-md shadow-lg border border-border z-10 hidden group-hover:block">
                {sortOptions.map(option => (
                  <button
                    key={option.id}
                    className="block w-full text-left px-4 py-2 hover:bg-secondary"
                    onClick={() => setSortBy(option.id as SortOption)}
                  >
                    {option.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex gap-2">
              <div className="flex rounded-md shadow-sm border border-border">
                <button
                  className={`px-3 py-2 rounded-l-md ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-background hover:bg-secondary'}`}
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  className={`px-3 py-2 rounded-r-md ${viewMode === 'columns' ? 'bg-primary text-white' : 'bg-background hover:bg-secondary'}`}
                  onClick={() => setViewMode('columns')}
                >
                  <Columns className="h-4 w-4" />
                </button>
              </div>
              
              <Button variant="outline" size="icon" title="Export Gallery" onClick={handleExportGallery}>
                <FileJson className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="outline" 
                size="icon" 
                title="Refresh Gallery"
                onClick={() => {
                  setIsLoading(true);
                  galleryDB.getAllImages().then(dbImages => {
                    setImages(dbImages);
                    setIsLoading(false);
                    toast({
                      title: "Gallery refreshed",
                      description: `Loaded ${dbImages.length} images from storage.`,
                    });
                  });
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'} gap-6`}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl overflow-hidden bg-muted/30">
                <div className="aspect-square bg-muted/50"></div>
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-muted/70 rounded-full w-3/4"></div>
                  <div className="h-3 bg-muted/50 rounded-full w-1/2"></div>
                  <div className="h-3 bg-muted/50 rounded-full w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'} gap-6`}>
            {images.map(image => (
              <div key={image.id} className="rounded-xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                <div className="aspect-square relative overflow-hidden bg-muted">
                  <img 
                    src={image.url} 
                    alt={image.prompt || 'Gallery image'} 
                    className="object-cover w-full h-full transition-transform hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm rounded-md px-2 py-1 text-xs font-medium">
                    {image.platform || 'Unknown'}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-sm line-clamp-2 mb-2" title={image.prompt}>
                    {image.prompt || 'No prompt available'}
                  </h3>
                  <div className="flex gap-2 mt-3 justify-end">
                    {image.prompt && (
                      <Button variant="outline" size="icon" onClick={() => handleCopyPrompt(image.prompt || '')}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="outline" size="icon" onClick={() => handleOpenSource(image.sourceURL)}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleDownload(image.url, `image-${image.id}`)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default GalleryView;
