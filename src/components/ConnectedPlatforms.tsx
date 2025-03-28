
import { useState, useEffect } from 'react';
import { RefreshCw, Power, ExternalLink, Check, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { brandConfig } from '@/config/brandConfig';

interface Platform {
  id: string;
  name: string;
  logo: string;
  connected: boolean;
  inProgress?: boolean;
  lastSynced?: string;
  error?: string;
}

const ConnectedPlatforms = () => {
  const { toast } = useToast();
  const [platforms, setPlatforms] = useState<Platform[]>([
    {
      id: 'midjourney',
      name: 'Midjourney',
      logo: 'https://seeklogo.com/images/M/midjourney-logo-631A578541-seeklogo.com.png',
      connected: false,
      lastSynced: null
    },
    {
      id: 'dalle',
      name: 'DALL·E',
      logo: 'https://seeklogo.com/images/D/dall-e-logo-0336A7D9B0-seeklogo.com.png',
      connected: false,
      lastSynced: null
    },
    {
      id: 'stableDiffusion',
      name: 'Stable Diffusion',
      logo: 'https://seeklogo.com/images/S/stable-diffusion-logo-F40B05BC4C-seeklogo.com.png',
      connected: false,
      lastSynced: null
    },
    {
      id: 'runway',
      name: 'Runway',
      logo: 'https://cdn.worldvectorlogo.com/logos/runway-2.svg',
      connected: false,
      lastSynced: null
    },
    {
      id: 'pika',
      name: 'Pika',
      logo: 'https://pikavideo.io/static/mstile-70x70.png',
      connected: false,
      lastSynced: null
    },
    {
      id: 'leonardo',
      name: 'Leonardo.ai',
      logo: 'https://camo.githubusercontent.com/75c5c5cc02eb5b8b3569b9155f97d25d3ad5bf4a0c0a058d026ceaa0091be0d4/68747470733a2f2f63646e2e737461727463646e2e636f2f6c6f676f732f6c656f6e6172646f2d61692f6c656f6e6172646f2d61692e737667',
      connected: false,
      lastSynced: null
    }
  ]);

  // Simulate checking platform connection status
  useEffect(() => {
    // This would typically be an API call to check which platforms are connected
    const checkPlatformConnections = async () => {
      // Simulate API response delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, let's assume Midjourney is connected
      setPlatforms(prev => 
        prev.map(platform => 
          platform.id === 'midjourney' 
            ? { ...platform, connected: true, lastSynced: new Date().toISOString() } 
            : platform
        )
      );
      
      // This simulates checking if a Chrome extension API would be available
      const extensionInstalled = await checkIfExtensionInstalled();
      if (!extensionInstalled) {
        toast({
          title: "Chrome Extension Required",
          description: "Install the MainGallery Chrome extension to enable platform connections",
          variant: "default",
        });
      }
    };
    
    checkPlatformConnections();
  }, [toast]);
  
  // Function to check if extension is installed
  const checkIfExtensionInstalled = async (): Promise<boolean> => {
    // In a real implementation, this would check if the extension is installed
    // For this demo, we'll simulate that it is installed
    return new Promise(resolve => setTimeout(() => resolve(true), 500));
  };

  const handleConnect = async (platform: Platform) => {
    // Skip if already in progress or connected
    if (platform.inProgress || platform.connected) return;
    
    // Update platform status to in-progress
    setPlatforms(prev => 
      prev.map(p => p.id === platform.id ? { ...p, inProgress: true } : p)
    );
    
    try {
      // Simulate API call to connect platform
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update platform status to connected
      setPlatforms(prev => 
        prev.map(p => p.id === platform.id 
          ? { 
              ...p, 
              inProgress: false, 
              connected: true, 
              lastSynced: new Date().toISOString() 
            } 
          : p
        )
      );
      
      toast({
        title: "Platform Connected",
        description: `${platform.name} has been connected to your MainGallery.`,
        variant: "default",
      });
    } catch (error) {
      // Handle error
      setPlatforms(prev => 
        prev.map(p => p.id === platform.id 
          ? { 
              ...p, 
              inProgress: false, 
              error: "Connection failed. Please try again." 
            } 
          : p
        )
      );
      
      toast({
        title: "Connection Failed",
        description: `Could not connect to ${platform.name}. Please try again.`,
        variant: "destructive",
      });
    }
  };
  
  const handleDisconnect = async (platform: Platform) => {
    // Skip if already in progress or not connected
    if (platform.inProgress || !platform.connected) return;
    
    // Update platform status to in-progress
    setPlatforms(prev => 
      prev.map(p => p.id === platform.id ? { ...p, inProgress: true } : p)
    );
    
    try {
      // Simulate API call to disconnect platform
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update platform status to disconnected
      setPlatforms(prev => 
        prev.map(p => p.id === platform.id 
          ? { 
              ...p, 
              inProgress: false, 
              connected: false, 
              lastSynced: null 
            } 
          : p
        )
      );
      
      toast({
        title: "Platform Disconnected",
        description: `${platform.name} has been disconnected from your MainGallery.`,
        variant: "default",
      });
    } catch (error) {
      // Handle error
      setPlatforms(prev => 
        prev.map(p => p.id === platform.id 
          ? { 
              ...p, 
              inProgress: false, 
              error: "Disconnection failed. Please try again." 
            } 
          : p
        )
      );
      
      toast({
        title: "Disconnection Failed",
        description: `Could not disconnect from ${platform.name}. Please try again.`,
        variant: "destructive",
      });
    }
  };
  
  const handleRefresh = async (platform: Platform) => {
    // Skip if already in progress or not connected
    if (platform.inProgress || !platform.connected) return;
    
    // Update platform status to in-progress
    setPlatforms(prev => 
      prev.map(p => p.id === platform.id ? { ...p, inProgress: true } : p)
    );
    
    try {
      // Simulate API call to refresh platform connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update platform status
      setPlatforms(prev => 
        prev.map(p => p.id === platform.id 
          ? { 
              ...p, 
              inProgress: false, 
              lastSynced: new Date().toISOString() 
            } 
          : p
        )
      );
      
      toast({
        title: "Sync Complete",
        description: `${platform.name} data has been refreshed.`,
        variant: "default",
      });
    } catch (error) {
      // Handle error
      setPlatforms(prev => 
        prev.map(p => p.id === platform.id 
          ? { 
              ...p, 
              inProgress: false, 
              error: "Refresh failed. Please try again." 
            } 
          : p
        )
      );
      
      toast({
        title: "Sync Failed",
        description: `Could not refresh data from ${platform.name}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  // Format last synced time
  const formatLastSynced = (lastSynced: string | null): string => {
    if (!lastSynced) return 'Never';
    
    const date = new Date(lastSynced);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Less than a minute
    if (diff < 60000) {
      return 'Just now';
    }
    
    // Less than an hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }
    
    // Less than a day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }
    
    // Format date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {platforms.map((platform) => (
          <div
            key={platform.id}
            className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-gray-50 dark:bg-gray-900 p-2 flex items-center justify-center">
                  <img
                    src={platform.logo}
                    alt={`${platform.name} logo`}
                    className="max-w-[80%] max-h-[80%] object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-medium">{platform.name}</h3>
                  <div className="flex items-center mt-1">
                    {platform.connected ? (
                      <Badge 
                        variant="secondary" 
                        className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0"
                      >
                        <Check className="mr-1 h-3 w-3" />
                        Connected
                      </Badge>
                    ) : platform.error ? (
                      <Badge 
                        variant="secondary" 
                        className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-0"
                      >
                        <AlertCircle className="mr-1 h-3 w-3" />
                        Error
                      </Badge>
                    ) : (
                      <Badge 
                        variant="secondary" 
                        className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 border-0"
                      >
                        Disconnected
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {platform.connected && (
              <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium">Last synced:</span>{' '}
                {formatLastSynced(platform.lastSynced)}
              </div>
            )}
            
            {platform.error && (
              <div className="mb-4 text-sm text-red-500">
                {platform.error}
              </div>
            )}
            
            <div className="flex gap-3">
              <TooltipProvider>
                {platform.connected ? (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => handleRefresh(platform)}
                          disabled={platform.inProgress}
                          variant="outline"
                          size="sm"
                          className="flex-1 rounded-xl"
                        >
                          {platform.inProgress ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                          )}
                          Sync
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Refresh data from {platform.name}</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => handleDisconnect(platform)}
                          disabled={platform.inProgress}
                          variant="outline"
                          size="sm"
                          className="flex-1 rounded-xl"
                        >
                          <Power className="h-4 w-4 mr-2" />
                          Disconnect
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Disconnect from {platform.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  </>
                ) : (
                  <Button
                    onClick={() => handleConnect(platform)}
                    disabled={platform.inProgress}
                    size="sm"
                    className="w-full rounded-xl"
                  >
                    {platform.inProgress ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4 mr-2" />
                    )}
                    Connect
                  </Button>
                )}
              </TooltipProvider>
            </div>
          </div>
        ))}
      </div>
      
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-2xl p-6 mt-8">
        <h3 className="text-lg font-medium mb-2">Chrome Extension Required</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          To enable platform connections, you need to install the MainGallery Chrome Extension. This allows secure access to your AI creations.
        </p>
        <Button size="sm" className="rounded-xl" onClick={() => window.open('https://chromewebstore.google.com/detail/maingallery/jbkahmmjacmfnlnpdopbcgbpmkjnblgk', '_blank')}>
          Install Chrome Extension
        </Button>
      </div>
    </div>
  );
};

export default ConnectedPlatforms;
