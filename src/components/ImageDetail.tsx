
import { useState } from 'react';
import { 
  Download, Copy, ExternalLink, Share2, ChevronLeft, 
  Info, Eye, Lock, FileWarning, Clipboard, Check
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link, useParams } from 'react-router-dom';

// Mock data - in a real app this would come from an API
const mockImages = [
  {
    id: '1',
    title: 'Cosmic Dreamscape',
    fullImage: 'https://images.unsplash.com/photo-1638803040283-7a5ffd48dad5?q=80&w=1080',
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
    fullImage: 'https://images.unsplash.com/photo-1518486645465-5311f2b30d3e?q=80&w=1080',
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
    fullImage: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?q=80&w=1080',
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
    fullImage: 'https://images.unsplash.com/photo-1574169208507-84376144848b?q=80&w=1080',
    platform: 'Runway',
    model: 'Gen-2',
    prompt: 'Abstract flowing forms with dynamic movement, vibrant colors on black background',
    createdAt: '2023-12-18T14:20:00Z',
    status: 'Draft',
    aspectRatio: '1:1',
    jobId: 'rw-234567891',
    seed: '23456789',
    duration: '4s',
    fps: '24'
  },
  {
    id: '5',
    title: 'Ocean Depths',
    fullImage: 'https://images.unsplash.com/photo-1551244072-5d12893278ab?q=80&w=1080',
    platform: 'Pika',
    model: 'Pika 1.0',
    prompt: 'Deep ocean scene with bioluminescent creatures and underwater structures',
    createdAt: '2023-12-20T11:10:00Z',
    status: 'Public',
    aspectRatio: '4:3',
    jobId: 'pk-345678912',
    seed: '34567891',
    duration: '6s',
    fps: '30'
  },
  {
    id: '6',
    title: 'Futuristic Architecture',
    fullImage: 'https://images.unsplash.com/photo-1523296020750-38f7d00b34ac?q=80&w=1080',
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

const ImageDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  
  // Find the image from our mock data
  const image = mockImages.find(img => img.id === id);
  
  if (!image) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Image not found</h2>
        <p className="mb-8">The image you're looking for doesn't exist or has been removed.</p>
        <Link to="/gallery">
          <Button>Back to Gallery</Button>
        </Link>
      </div>
    );
  }
  
  // Format the date
  const formattedDate = new Date(image.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Status badge configuration
  const getStatusBadge = () => {
    switch (image.status) {
      case 'Public':
        return (
          <Badge className="bg-green-500/10 text-green-600 flex items-center">
            <Eye className="h-3 w-3 mr-1" />
            Public
          </Badge>
        );
      case 'Private':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 flex items-center">
            <Lock className="h-3 w-3 mr-1" />
            Private
          </Badge>
        );
      case 'Draft':
        return (
          <Badge className="bg-gray-500/10 text-gray-600 flex items-center">
            <FileWarning className="h-3 w-3 mr-1" />
            Draft
          </Badge>
        );
      default:
        return null;
    }
  };
  
  // Platform badge configuration
  const getPlatformBadge = () => {
    let classes = "px-2 py-1 rounded-full text-xs font-medium flex items-center";
    
    switch (image.platform.toLowerCase()) {
      case 'midjourney':
        return <span className={`${classes} bg-blue-500/10 text-blue-600`}>{image.platform}</span>;
      case 'dall·e':
        return <span className={`${classes} bg-green-500/10 text-green-600`}>{image.platform}</span>;
      case 'stable diffusion':
        return <span className={`${classes} bg-purple-500/10 text-purple-600`}>{image.platform}</span>;
      case 'runway':
        return <span className={`${classes} bg-red-500/10 text-red-600`}>{image.platform}</span>;
      case 'pika':
        return <span className={`${classes} bg-yellow-500/10 text-yellow-600`}>{image.platform}</span>;
      default:
        return <span className={`${classes} bg-primary/10 text-primary`}>{image.platform}</span>;
    }
  };
  
  const copyPrompt = () => {
    navigator.clipboard.writeText(image.prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };
  
  const downloadImage = () => {
    // In a real application, this would trigger the actual download
    console.log('Downloading image:', image.title);
    // Example implementation:
    // const link = document.createElement('a');
    // link.href = image.fullImage;
    // link.download = `${image.title}.jpg`;
    // document.body.appendChild(link);
    // link.click();
    // document.body.removeChild(link);
  };
  
  const openOriginal = () => {
    // In a real application, this would open the original source in a new tab
    console.log('Opening original source for:', image.title);
    window.open('#', '_blank');
  };
  
  const shareImage = () => {
    // In a real application, this would trigger sharing functionality
    console.log('Sharing image:', image.title);
    // Example implementation with Web Share API:
    // if (navigator.share) {
    //   navigator.share({
    //     title: image.title,
    //     text: `Check out this AI-generated image: ${image.title}`,
    //     url: window.location.href,
    //   });
    // }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Back button */}
      <Link to="/gallery" className="inline-flex items-center text-sm font-medium text-foreground/70 hover:text-primary mb-8">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Gallery
      </Link>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Image section */}
        <div className="lg:col-span-2">
          <div className="bg-muted/30 rounded-xl overflow-hidden shadow-subtle">
            <img 
              src={image.fullImage}
              alt={image.title}
              className="w-full h-auto object-contain"
            />
          </div>
          
          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 mt-6">
            <Button onClick={downloadImage} className="flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            
            <Button variant="outline" onClick={copyPrompt} className="flex items-center">
              {copiedPrompt ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Prompt
                </>
              )}
            </Button>
            
            <Button variant="outline" onClick={openOriginal} className="flex items-center">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Original
            </Button>
            
            <Button variant="outline" onClick={shareImage} className="flex items-center">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
        
        {/* Details section */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-2xl font-bold">{image.title}</h1>
              {getStatusBadge()}
            </div>
            
            <div className="flex items-center space-x-3 mb-4">
              {getPlatformBadge()}
              <Badge variant="outline">{image.model}</Badge>
            </div>
            
            <div className="text-sm text-foreground/70 mb-6">
              Created on {formattedDate}
            </div>
          </div>
          
          {/* Prompt section */}
          <div className="bg-muted/20 p-4 rounded-lg border border-border/70">
            <div className="text-sm font-medium mb-2">Prompt</div>
            <p className="text-foreground/80 text-sm">{image.prompt}</p>
          </div>
          
          {/* Technical details */}
          <Accordion type="single" collapsible className="border border-border/70 rounded-lg">
            <AccordionItem value="technical-details" className="border-none">
              <AccordionTrigger className="px-4 py-3 hover:bg-muted/20">
                <div className="flex items-center text-foreground/80">
                  <Info className="h-4 w-4 mr-2" />
                  Technical Details
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-foreground/70">Job ID</span>
                    <span className="font-mono">{image.jobId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/70">Seed</span>
                    <span className="font-mono">{image.seed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/70">Aspect Ratio</span>
                    <span>{image.aspectRatio}</span>
                  </div>
                  {image.duration && (
                    <div className="flex justify-between">
                      <span className="text-foreground/70">Duration</span>
                      <span>{image.duration}</span>
                    </div>
                  )}
                  {image.fps && (
                    <div className="flex justify-between">
                      <span className="text-foreground/70">FPS</span>
                      <span>{image.fps}</span>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  );
};

export default ImageDetail;
