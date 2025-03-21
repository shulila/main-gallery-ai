
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ImageCard } from './ImageCard';
import { Button } from "@/components/ui/button";
import { Grid, Columns, Calendar, Filter, ChevronDown } from 'lucide-react';

// Mock data for our gallery
const mockImages = [
  {
    id: '1',
    title: 'Cosmic Dreamscape',
    thumbnail: 'https://images.unsplash.com/photo-1638803040283-7a5ffd48dad5?q=80&w=400',
    platform: 'Midjourney',
    model: 'V6',
    prompt: 'A cosmic landscape with nebulas and floating islands, vibrant colors, surreal atmosphere',
    createdAt: '2023-12-01T12:30:00Z',
    status: 'Public',
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
    status: 'Private',
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
    status: 'Public',
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
    status: 'Draft',
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
    status: 'Public',
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
    status: 'Private',
    aspectRatio: '16:9',
    jobId: 'mj-456789123',
    seed: '45678912'
  }
];

type ViewMode = 'grid' | 'columns';
type SortOption = 'newest' | 'oldest' | 'platform';
type FilterOption = 'all' | 'midjourney' | 'dalle' | 'stable-diffusion' | 'runway' | 'pika';

const GalleryView = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [images, setImages] = useState(mockImages);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Apply sorting and filtering
  useEffect(() => {
    let filteredImages = [...mockImages];
    
    // Apply platform filter
    if (filterBy !== 'all') {
      filteredImages = filteredImages.filter(img => 
        img.platform.toLowerCase().replace(/·/g, '').replace(/\s/g, '-') === filterBy
      );
    }
    
    // Apply sorting
    filteredImages.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'platform') {
        return a.platform.localeCompare(b.platform);
      }
      return 0;
    });
    
    setImages(filteredImages);
  }, [sortBy, filterBy]);

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
            {/* Filter dropdown */}
            <div className="relative">
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
            
            {/* Sort dropdown */}
            <div className="relative">
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
            
            {/* View mode toggles */}
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
          </div>
        </div>
        
        {isLoading ? (
          // Loading skeleton
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
              <Link to={`/detail/${image.id}`} key={image.id}>
                <ImageCard image={image} />
              </Link>
            ))}
          </div>
        )}
        
        {images.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <div className="mb-4 text-muted-foreground">
              <Image className="h-16 w-16 mx-auto opacity-30" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No images found</h3>
            <p className="text-muted-foreground mb-6">Try adjusting your filters or connect more platforms.</p>
            <Button>Connect a Platform</Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default GalleryView;
