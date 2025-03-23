
import {
  Check,
  ExternalLink,
  RefreshCw,
  Settings,
  Unplug,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

const ConnectedPlatforms = () => {
  const platforms = [
    {
      name: 'Midjourney',
      logo: 'https://seeklogo.com/images/M/midjourney-logo-631A578541-seeklogo.com.png',
      status: 'connected',
      lastSync: '5 minutes ago',
      itemCount: 253,
    },
    {
      name: 'DALL·E',
      logo: 'https://seeklogo.com/images/D/dall-e-logo-0336A7D9B0-seeklogo.com.png',
      status: 'connected',
      lastSync: '3 hours ago',
      itemCount: 128,
    },
    {
      name: 'Stable Diffusion',
      logo: 'https://seeklogo.com/images/S/stable-diffusion-logo-F40B05BC4C-seeklogo.com.png',
      status: 'not_connected',
      description: 'Connect to your DreamStudio gallery'
    },
    {
      name: 'Runway',
      logo: 'https://cdn.worldvectorlogo.com/logos/runway-2.svg',
      status: 'not_connected',
      description: 'Access your Runway Gen-1 and Gen-2 videos and images'
    },
    {
      name: 'Pika',
      logo: 'https://pikavideo.io/static/mstile-70x70.png',
      status: 'connected',
      lastSync: '1 day ago',
      itemCount: 42,
    },
    {
      name: 'Leonardo.ai',
      logo: 'https://camo.githubusercontent.com/75c5c5cc02eb5b8b3569b9155f97d25d3ad5bf4a0c0a058d026ceaa0091be0d4/68747470733a2f2f63646e2e737461727463646e2e636f2f6c6f676f732f6c656f6e6172646f2d61692f6c656f6e6172646f2d61692e737667',
      status: 'coming_soon',
      description: 'Support for Leonardo.ai is coming soon'
    }
  ];

  const handleRefresh = (platformName: string) => {
    toast({
      title: "Refreshing connection",
      description: `Syncing new content from ${platformName}...`,
    });
  };

  const handleDisconnect = (platformName: string) => {
    toast({
      title: "Platform disconnected",
      description: `${platformName} has been disconnected from your gallery.`,
    });
  };

  const handleSettings = (platformName: string) => {
    toast({
      title: "Platform settings",
      description: `${platformName} settings will be available soon.`,
    });
  };

  const handleConnect = (platformName: string) => {
    toast({
      title: "Connecting...",
      description: `Please install our Chrome extension to connect to ${platformName}.`,
    });
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {platforms.map((platform, index) => (
          <div 
            key={index} 
            className="bg-background rounded-xl p-6 border border-border/50 hover:shadow-hover transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mr-4 shadow-subtle">
                  <img 
                    src={platform.logo} 
                    alt={`${platform.name} logo`} 
                    className="max-w-[60%] max-h-[60%] object-contain"
                  />
                </div>
                <div>
                  <h4 className="text-lg font-semibold">{platform.name}</h4>
                  <div className="flex items-center">
                    {platform.status === 'connected' ? (
                      <span className="text-green-500 text-sm flex items-center">
                        <Check className="h-3 w-3 mr-1" /> Connected
                      </span>
                    ) : platform.status === 'not_connected' ? (
                      <span className="text-gray-500 text-sm">Not connected</span>
                    ) : (
                      <span className="text-amber-500 text-sm">Coming soon</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {platform.status === 'connected' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div>Last synced:</div>
                  <div className="text-foreground">{platform.lastSync}</div>
                  <div>Items:</div>
                  <div className="text-foreground">{platform.itemCount}</div>
                </div>
                
                <div className="flex justify-between gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleRefresh(platform.name)}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Refresh
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleSettings(platform.name)}
                  >
                    <Settings className="h-3.5 w-3.5 mr-1" />
                    Settings
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleDisconnect(platform.name)}
                  >
                    <Unplug className="h-3.5 w-3.5 mr-1" />
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : platform.status === 'not_connected' ? (
              <div className="space-y-4">
                <p className="text-foreground/70 text-sm">{platform.description}</p>
                <Button 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => handleConnect(platform.name)}
                >
                  Connect
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-foreground/70 text-sm">{platform.description}</p>
                <Button 
                  size="sm" 
                  className="w-full mt-2"
                  variant="outline"
                  disabled
                >
                  Coming Soon
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="bg-muted/40 rounded-xl p-6 border border-border/50 mt-10">
        <h3 className="text-lg font-semibold mb-2 flex items-center">
          <ImageIcon className="h-5 w-5 mr-2 text-primary" />
          Need to connect more platforms?
        </h3>
        <p className="text-muted-foreground mb-4">
          Our Chrome extension makes it easy to connect additional AI image and video generators to your gallery.
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-full"
          onClick={() => window.open('https://chrome.google.com/webstore/detail/main-gallery/example', '_blank')}
        >
          Install Chrome Extension
          <ExternalLink className="h-3 w-3 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default ConnectedPlatforms;
