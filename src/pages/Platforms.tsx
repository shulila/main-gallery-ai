
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import PlatformIntegration from '@/components/PlatformIntegration';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import ConnectedPlatforms from '@/components/ConnectedPlatforms';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, XCircle, Settings, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Define platform types
type Platform = {
  id: string;
  name: string;
  logo: string;
  isConnected: boolean;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
};

const Platforms = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [platforms, setPlatforms] = useState<Platform[]>([
    {
      id: 'midjourney',
      name: 'Midjourney',
      logo: '/images/midjourney-logo.png',
      isConnected: false,
      status: 'disconnected'
    },
    {
      id: 'leonardo',
      name: 'Leonardo.ai',
      logo: '/images/leonardo-logo.png',
      isConnected: false,
      status: 'disconnected'
    },
    {
      id: 'dalle',
      name: 'DALL·E',
      logo: '/images/dalle-logo.png',
      isConnected: false,
      status: 'disconnected'
    },
    {
      id: 'stable-diffusion',
      name: 'Stable Diffusion',
      logo: '/images/sd-logo.png',
      isConnected: false,
      status: 'disconnected'
    },
    {
      id: 'pika',
      name: 'Pika',
      logo: '/images/pika-logo.png',
      isConnected: false,
      status: 'disconnected'
    },
    {
      id: 'runway',
      name: 'Runway',
      logo: '/images/runway-logo.png',
      isConnected: false,
      status: 'disconnected'
    }
  ]);
  
  // Check for connected platforms via extension API
  useEffect(() => {
    const checkPlatformConnections = async () => {
      try {
        // Detect if extension is installed
        const isExtensionInstalled = await detectExtension();
        
        if (isExtensionInstalled) {
          // For each platform, check connection status
          const updatedPlatforms = await Promise.all(
            platforms.map(async (platform) => {
              const isConnected = await checkPlatformConnection(platform.id);
              return {
                ...platform,
                isConnected,
                status: isConnected ? 'connected' as const : 'disconnected' as const,
                lastSync: isConnected ? new Date().toISOString() : undefined
              };
            })
          );
          
          setPlatforms(updatedPlatforms);
        }
      } catch (error) {
        console.error('Error checking platform connections:', error);
      }
    };
    
    if (user) {
      checkPlatformConnections();
    }
  }, [user, platforms]);

  // Detect if extension is installed
  const detectExtension = async (): Promise<boolean> => {
    try {
      // Try to send a message to the extension
      // This will throw an error if the extension is not installed
      if (window.chrome && window.chrome.runtime) {
        // Fix: Add the required extensionId parameter (undefined for same extension)
        await window.chrome.runtime.sendMessage(undefined, { action: 'isInstalled' });
        return true;
      }
      return false;
    } catch (error) {
      console.log('Extension not detected:', error);
      return false;
    }
  };

  // Check if a platform is connected via the extension
  const checkPlatformConnection = async (platformId: string): Promise<boolean> => {
    try {
      // In a real implementation, this would use the extension API
      // For demo, we'll simulate based on localStorage
      const connectedPlatforms = localStorage.getItem('connectedPlatforms');
      if (connectedPlatforms) {
        const platforms = JSON.parse(connectedPlatforms);
        return platforms.includes(platformId);
      }
      return false;
    } catch (error) {
      console.error('Error checking platform connection:', error);
      return false;
    }
  };

  // Toggle platform connection
  const toggleConnection = async (platformId: string, isCurrentlyConnected: boolean) => {
    try {
      // In a real implementation, this would use the extension API
      // For demo, we'll simulate based on localStorage
      let connectedPlatforms: string[] = [];
      const storedPlatforms = localStorage.getItem('connectedPlatforms');
      
      if (storedPlatforms) {
        connectedPlatforms = JSON.parse(storedPlatforms);
      }
      
      if (isCurrentlyConnected) {
        // Disconnect
        connectedPlatforms = connectedPlatforms.filter(id => id !== platformId);
        toast({
          title: "Platform disconnected",
          description: `Successfully disconnected ${platforms.find(p => p.id === platformId)?.name}`,
        });
      } else {
        // Connect
        if (!connectedPlatforms.includes(platformId)) {
          connectedPlatforms.push(platformId);
        }
        toast({
          title: "Platform connected",
          description: `Successfully connected ${platforms.find(p => p.id === platformId)?.name}`,
        });
      }
      
      localStorage.setItem('connectedPlatforms', JSON.stringify(connectedPlatforms));
      
      // Update platforms state
      setPlatforms(prevPlatforms =>
        prevPlatforms.map(platform => {
          if (platform.id === platformId) {
            return {
              ...platform,
              isConnected: !isCurrentlyConnected,
              status: !isCurrentlyConnected ? 'connected' : 'disconnected',
              lastSync: !isCurrentlyConnected ? new Date().toISOString() : undefined
            };
          }
          return platform;
        })
      );
    } catch (error) {
      console.error('Error toggling platform connection:', error);
      toast({
        variant: "destructive",
        title: "Connection error",
        description: "Failed to update platform connection status",
      });
    }
  };

  // Refresh platform sync
  const refreshPlatform = async (platformId: string) => {
    try {
      toast({
        title: "Refreshing content",
        description: `Syncing latest content from ${platforms.find(p => p.id === platformId)?.name}...`,
      });
      
      // Simulate refresh delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update lastSync time
      setPlatforms(prevPlatforms =>
        prevPlatforms.map(platform => {
          if (platform.id === platformId) {
            return {
              ...platform,
              lastSync: new Date().toISOString()
            };
          }
          return platform;
        })
      );
      
      toast({
        title: "Sync complete",
        description: `Successfully refreshed content from ${platforms.find(p => p.id === platformId)?.name}`,
      });
    } catch (error) {
      console.error('Error refreshing platform:', error);
      toast({
        variant: "destructive",
        title: "Sync failed",
        description: "Failed to refresh platform content",
      });
    }
  };

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24">
        <div className="container mx-auto px-4 py-8">
          {user ? (
            // Logged in user sees the connected platforms management view
            <>
              <h1 className="text-3xl font-bold mb-2 text-center">Platform Manager</h1>
              <p className="text-muted-foreground text-center mb-8">Connect and manage your AI platforms</p>
              
              {/* Platform Dashboard UI */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {platforms.map(platform => (
                  <div 
                    key={platform.id}
                    className="bg-card border rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md"
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                            <img 
                              src={platform.logo} 
                              alt={platform.name} 
                              className="w-6 h-6"
                              onError={(e) => {
                                // Fallback for missing images
                                (e.target as HTMLImageElement).src = '/placeholder.svg';
                              }}
                            />
                          </div>
                          <div>
                            <h3 className="font-medium">{platform.name}</h3>
                            <div className="flex items-center mt-1">
                              {platform.status === 'connected' ? (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-200 px-2 py-0">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Connected
                                </Badge>
                              ) : platform.status === 'error' ? (
                                <Badge variant="destructive" className="px-2 py-0">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Error
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="px-2 py-0">
                                  Disconnected
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {platform.lastSync && (
                        <p className="text-xs text-muted-foreground mb-4">
                          Last synced: {new Date(platform.lastSync).toLocaleString()}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 mt-4">
                        <Button
                          variant={platform.isConnected ? "outline" : "default"}
                          size="sm"
                          className="flex-1"
                          onClick={() => toggleConnection(platform.id, platform.isConnected)}
                        >
                          {platform.isConnected ? "Disconnect" : "Connect"}
                        </Button>
                        
                        {platform.isConnected && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => refreshPlatform(platform.id)}
                            title="Refresh content"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {platform.isConnected && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Platform settings"
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Extension Instructions if no platforms connected */}
              {platforms.every(p => !p.isConnected) && (
                <div className="mt-10 p-6 border border-dashed rounded-2xl">
                  <h3 className="text-lg font-medium mb-2">Connect your first platform</h3>
                  <p className="text-muted-foreground mb-4">
                    Use the MainGallery browser extension to connect your AI platforms and automatically
                    sync your creations.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 mt-6">
                    <Button asChild>
                      <a href="https://chrome.google.com/webstore/detail/maingallery-ai-art-collec/placeholder" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Get Chrome Extension
                      </a>
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/gallery')}>
                      Continue to Gallery
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="mt-12">
                <ConnectedPlatforms />
              </div>
            </>
          ) : (
            // Not logged in user sees integration explanation
            <>
              <h1 className="text-3xl font-bold mb-2 text-center">Platform Integrations</h1>
              <p className="text-muted-foreground text-center mb-8">Connect your favorite AI platforms to MainGallery</p>
              <PlatformIntegration />
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Platforms;
