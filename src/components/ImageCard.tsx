
import { Download, Copy, ExternalLink, Share2, Eye, LockIcon, FileWarning } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface Image {
  id: string;
  title: string;
  thumbnail: string;
  platform: string;
  model: string;
  prompt: string;
  createdAt: string;
  status: 'Public' | 'Private' | 'Draft';
  aspectRatio?: string;
  jobId?: string;
  seed?: string;
  duration?: string;
}

export const ImageCard = ({ image }: { image: Image }) => {
  // Format the date
  const formattedDate = new Date(image.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  
  // Truncate prompt for display
  const truncatedPrompt = image.prompt.length > 100 
    ? `${image.prompt.substring(0, 100)}...` 
    : image.prompt;
  
  // Determine status icon
  const getStatusIcon = () => {
    switch (image.status) {
      case 'Public':
        return <Eye className="h-3 w-3" />;
      case 'Private':
        return <LockIcon className="h-3 w-3" />;
      case 'Draft':
        return <FileWarning className="h-3 w-3" />;
      default:
        return <Eye className="h-3 w-3" />;
    }
  };
  
  // Determine platform color
  const getPlatformColor = () => {
    switch (image.platform.toLowerCase()) {
      case 'midjourney':
        return 'bg-blue-500/10 text-blue-600';
      case 'dall·e':
        return 'bg-green-500/10 text-green-600';
      case 'stable diffusion':
        return 'bg-purple-500/10 text-purple-600';
      case 'runway':
        return 'bg-red-500/10 text-red-600';
      case 'pika':
        return 'bg-yellow-500/10 text-yellow-600';
      default:
        return 'bg-primary/10 text-primary';
    }
  };
  
  const handleAction = (action: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation since we're in a Link
    
    switch (action) {
      case 'download':
        console.log('Downloading:', image.title);
        break;
      case 'copy':
        navigator.clipboard.writeText(image.prompt);
        console.log('Copied prompt to clipboard');
        break;
      case 'open':
        console.log('Opening original source');
        // This would typically open in a new tab
        window.open('#', '_blank');
        break;
      case 'share':
        console.log('Sharing:', image.title);
        break;
    }
  };

  return (
    <div className="group rounded-xl overflow-hidden border border-border/50 bg-background hover:shadow-hover transition-all duration-300 image-card">
      {/* Image thumbnail with overlay */}
      <div className="relative aspect-square overflow-hidden bg-muted/30">
        <img 
          src={image.thumbnail} 
          alt={image.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy" 
        />
        
        {/* Hover overlay with actions */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
          <div className="flex space-x-2 justify-end mb-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="h-8 w-8 rounded-full bg-white/20 border-white/40 text-white hover:bg-white/30"
                    onClick={(e) => handleAction('download', e)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Download</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="h-8 w-8 rounded-full bg-white/20 border-white/40 text-white hover:bg-white/30"
                    onClick={(e) => handleAction('copy', e)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Copy Prompt</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="h-8 w-8 rounded-full bg-white/20 border-white/40 text-white hover:bg-white/30"
                    onClick={(e) => handleAction('open', e)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Open Original</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="h-8 w-8 rounded-full bg-white/20 border-white/40 text-white hover:bg-white/30"
                    onClick={(e) => handleAction('share', e)}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Share</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
      
      {/* Image info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-medium text-lg truncate">{image.title}</h3>
          <Badge 
            variant="outline" 
            className={`ml-2 flex items-center space-x-1 text-xs ${
              image.status === 'Public' ? 'bg-green-500/10 text-green-600' : 
              image.status === 'Private' ? 'bg-amber-500/10 text-amber-600' :
              'bg-gray-500/10 text-gray-600'
            }`}
          >
            {getStatusIcon()}
            <span className="ml-1">{image.status}</span>
          </Badge>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge className={getPlatformColor()}>
            {image.platform}
          </Badge>
          <Badge variant="outline">
            {image.model}
          </Badge>
        </div>
        
        <p className="text-foreground/70 text-sm mb-3 line-clamp-2" title={image.prompt}>
          {truncatedPrompt}
        </p>
        
        <div className="text-xs text-muted-foreground flex justify-between items-center">
          <span>{formattedDate}</span>
          {image.duration && <span>{image.duration}</span>}
        </div>
      </div>
    </div>
  );
};
