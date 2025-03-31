import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ImageCard } from './ImageCard';
import { Button } from "@/components/ui/button";
import { Grid, Columns, Calendar, Filter, ChevronDown, ImageIcon, Download, Copy, ExternalLink, FileJson, RefreshCw } from 'lucide-react';
import { galleryDB } from '@/services/GalleryIndexedDB';
import { useToast } from "@/hooks/use-toast";

type GalleryImage = {
  id: string;
  url: string;
  prompt?: string;
  platform?: string;
  creationDate?: string;
  sourceURL: string;
  timestamp: number;
};

const mockImages = [
  {
    id: '1',
    title: 'Cosmic Dreamscape',
    thumbnail: 'https://images.unsplash.com/photo-1638803040283-7a5ffd48dad5?q=80&w=400',
    platform: 'Midjourney',
    model: 'V6',
    prompt: 'A cosmic landscape with nebulas and floating islands, vibrant colors, surreal atmosphere',
    createdAt: '2023-12-01T12:30:00Z',
    status: 'Public' as const,
    aspectRatio: '1:1',
    jobId: 'mj-123456789',
    seed: '12345678'
  },
  {
    id: '2',
    title: 'Cyberpunk City',
    thumbnail: 'https://images.unsplash.com/photo-1518486645465-5311f2b30d3e?q=80&w=400',
    platform: 'DALL·E',
    model: 'DALL·E 3',
    prompt: 'Cyberpunk city at night with neon lights, flying cars, and tall skyscrapers',
    createdAt: '2023-12-10T09:15:00Z',
    status: 'Private' as const,
    aspectRatio: '16:9',
    jobId: 'dalle-987654321',
    seed: '87654321'
  },
  {
    id: '3',
    title: 'Enchanted Forest',
    thumbnail: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?q=80&w=400',
    platform: 'Stable Diffusion',
    model: 'SDXL',
    prompt: 'Magical forest with glowing plants and mystical creatures, fantasy art style',
    createdAt: '2023-12-15T16:45:00Z',
    status: 'Public' as const,
    aspectRatio: '3:2',
    jobId: 'sd-456789123',
    seed: '45678912'
  },
  {
    id: '4',
    title: 'Abstract Motion',
    thumbnail: 'https://images.unsplash.com/photo-1574169208507-84376144848b?q=80&w=400',
    platform: 'Runway',
    model: 'Gen-2',
    prompt: 'Abstract flowing forms with dynamic movement, vibrant colors on black background',
    createdAt: '2023-12-18T14:20:00Z',
    status: 'Draft' as const,
    aspectRatio: '1:1',
    jobId: 'rw-234567891',
    seed: '23456789',
    duration: '4s'
  },
  {
    id: '5',
    title: 'Ocean Depths',
    thumbnail: 'https://images.unsplash.com/photo-1551244072-5d12893278ab?q=80&w=400',
    platform: 'Pika',
    model: 'Pika 1.0',
    prompt: 'Deep ocean scene with bioluminescent creatures and underwater structures',
    createdAt: '2023-12-20T11:10:00Z',
    status: 'Public' as const,
    aspectRatio: '4:3',
    jobId: 'pk-345678912',
    seed: '34567891',
    duration: '6s'
  },
  {
    id: '6',
    title: 'Futuristic Architecture',
    thumbnail: 'https://images.unsplash.com/photo-1523296020750-38f7d00b34ac?q=80&w=400',
    platform: 'Midjourney',
    model: 'V6',
    prompt: 'Futuristic architectural structure with organic forms, glass and steel materials',
    createdAt: '2023-12-22T10:30:00Z',
    status: 'Private' as const,
    aspectRatio: '16:9',
    jobId: 'mj-456789123',
    seed: '45678912'
  }
];

type ViewMode = 'grid' | 'columns';
type SortOption = 'newest' | 'oldest' | 'platform';
type FilterOption = 'all' | 'midjourney' | 'dalle' | 'stable-diffusion' | 'runway' | 'pika';

interface GalleryViewProps {
  images?: GalleryImage[];
}

const GalleryView = ({ images: externalImages }: GalleryViewProps) => {
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
      
      const formattedImages: GalleryImage[] = incomingImages.map((img) => ({
        id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        url: img.src || img.url || '',
        prompt: img.prompt || img.alt || img.title || '',
        platform: img.platform || img.platformName || 'unknown',
        creationDate: img.creationDate || new Date().toISOString(),
        sourceURL: img.tabUrl || img.sourceUrl || window.location.href,
        timestamp: Date.now()
      }));

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
        } else if (process.env.NODE_ENV !== 'production') {
          console.log('No images found in DB, using mock data');
          setImages(mockImages as unknown as GalleryImage[]);
        }
      } catch (error) {
        console.error('Error loading images from IndexedDB:', error);
        if (process.env.NODE_ENV !== 'production') {
          setImages(mockImages as unknown as GalleryImage[]);
        }
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
        
        {images.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <div className="mb-4 text-muted-foreground">
              <ImageIcon className="h-16 w-16 mx-auto opacity-30" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No images found</h3>
            <p className="text-muted-foreground mb-6">Try adjusting your filters or use the Chrome extension to scan for images.</p>
            <Button>Connect a Platform</Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default GalleryView;
