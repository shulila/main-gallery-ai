
import {
  Check,
  ExternalLink,
  RefreshCw,
  Settings,
  Unplug,
  Image as ImageIcon,
  Info,
  AlertCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {platforms.map((platform, index) => (
          <Card key={index} className="overflow-hidden border-border/40 transition-all hover:shadow-md">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mr-3 shadow-sm">
                    <img 
                      src={platform.logo} 
                      alt={`${platform.name} logo`} 
                      className="max-w-[60%] max-h-[60%] object-contain"
                    />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{platform.name}</CardTitle>
                    <div className="flex items-center mt-1">
                      {platform.status === 'connected' ? (
                        <Badge variant="success" className="text-xs font-normal">
                          <Check className="h-3 w-3 mr-1" /> Connected
                        </Badge>
                      ) : platform.status === 'not_connected' ? (
                        <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                          Not connected
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs font-normal text-amber-500 border-amber-200 bg-amber-50">
                          Coming soon
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pb-4">
              {platform.status === 'connected' ? (
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    <div className="text-muted-foreground">Last synced:</div>
                    <div>{platform.lastSync}</div>
                    <div className="text-muted-foreground">Items:</div>
                    <div>{platform.itemCount}</div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {platform.description}
                </p>
              )}
            </CardContent>
            
            <CardFooter className="pt-0">
              {platform.status === 'connected' ? (
                <div className="flex w-full justify-between gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 text-xs"
                          onClick={() => handleRefresh(platform.name)}
                        >
                          <RefreshCw className="h-3.5 w-3.5 mr-1" />
                          Refresh
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Sync latest content from {platform.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 text-xs"
                          onClick={() => handleSettings(platform.name)}
                        >
                          <Settings className="h-3.5 w-3.5 mr-1" />
                          Settings
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Configure {platform.name} connection</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 text-xs"
                          onClick={() => handleDisconnect(platform.name)}
                        >
                          <Unplug className="h-3.5 w-3.5 mr-1" />
                          Disconnect
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Remove {platform.name} connection</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ) : platform.status === 'not_connected' ? (
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={() => handleConnect(platform.name)}
                >
                  Connect
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  className="w-full"
                  variant="outline"
                  disabled
                >
                  Coming Soon
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
      
      <Card className="bg-muted/40 border-border/30 mt-10">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <ImageIcon className="h-5 w-5 mr-2 text-primary" />
            Chrome Extension Required
          </CardTitle>
          <CardDescription>
            Our Chrome extension makes it easy to connect additional AI platforms to your gallery.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm flex items-start">
            <AlertCircle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Important</p>
              <p className="text-amber-700 mt-1">
                The Chrome extension is required to connect your AI platforms. Once installed, visit your platform's gallery page to connect it to MainGallery.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full"
            onClick={() => window.open('https://chrome.google.com/webstore/detail/main-gallery/example', '_blank')}
          >
            Install Chrome Extension
            <ExternalLink className="h-3 w-3 ml-2" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ConnectedPlatforms;
