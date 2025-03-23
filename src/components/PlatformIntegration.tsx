
import {
  Check,
  Chrome,
  ExternalLink,
  Zap,
  Lock,
  Image as ImageIcon,
  Laptop,
  Info,
  Clock
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { brandConfig } from '@/config/brandConfig';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const PlatformIntegration = () => {
  const navigate = useNavigate();
  
  const supportedPlatforms = [
    {
      name: 'Midjourney',
      logo: 'https://seeklogo.com/images/M/midjourney-logo-631A578541-seeklogo.com.png',
      status: 'Ready',
      description: 'Connect to your Midjourney gallery via Discord integration'
    },
    {
      name: 'DALL·E',
      logo: 'https://seeklogo.com/images/D/dall-e-logo-0336A7D9B0-seeklogo.com.png',
      status: 'Ready',
      description: 'Access your OpenAI DALL·E creations'
    },
    {
      name: 'Stable Diffusion',
      logo: 'https://seeklogo.com/images/S/stable-diffusion-logo-F40B05BC4C-seeklogo.com.png',
      status: 'Ready',
      description: 'Connect to your DreamStudio gallery'
    },
    {
      name: 'Runway',
      logo: 'https://cdn.worldvectorlogo.com/logos/runway-2.svg',
      status: 'Ready',
      description: 'Access your Runway Gen-1 and Gen-2 videos and images'
    },
    {
      name: 'Pika',
      logo: 'https://pikavideo.io/static/mstile-70x70.png',
      status: 'Ready',
      description: 'Access your Pika video creations'
    },
    {
      name: 'Leonardo.ai',
      logo: 'https://camo.githubusercontent.com/75c5c5cc02eb5b8b3569b9155f97d25d3ad5bf4a0c0a058d026ceaa0091be0d4/68747470733a2f2f63646e2e737461727463646e2e636f2f6c6f676f732f6c656f6e6172646f2d61692f6c656f6e6172646f2d61692e737667',
      status: 'Ready',
      description: 'Integration with Leonardo.ai is now available'
    }
  ];

  const integrationSteps = [
    {
      icon: <Chrome className="h-8 w-8 text-primary" />,
      title: 'Install Chrome Extension',
      description: 'Get our lightweight Chrome extension to seamlessly connect to AI art platforms.'
    },
    {
      icon: <Laptop className="h-8 w-8 text-primary" />,
      title: 'Visit Your AI Platform',
      description: 'Navigate to the gallery page of your AI platform (Midjourney, DALL·E, etc.).'
    },
    {
      icon: <Zap className="h-8 w-8 text-primary" />,
      title: 'One-Click Connection',
      description: 'Click "Add to Main Gallery" and we\'ll automatically detect and configure the connection.'
    },
    {
      icon: <Lock className="h-8 w-8 text-primary" />,
      title: 'Secure Authorization',
      description: 'Authenticate securely using OAuth or API tokens with industry-standard encryption.'
    },
    {
      icon: <ImageIcon className="h-8 w-8 text-primary" />,
      title: 'Instant Access',
      description: 'View all your images and videos in one place without uploading or transferring files.'
    }
  ];

  const handleGetStarted = () => {
    navigate('/start');
  };

  return (
    <section id="platforms" className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            Seamless Integration
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
            Connect all your AI art platforms in one click
          </h2>
          <p className="text-lg text-foreground/80">
            Our Chrome extension makes it incredibly easy to connect your favorite AI image and video generators to your Main Gallery.
          </p>
        </div>
        
        {/* Integration steps */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-20">
          {integrationSteps.map((step, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              <div className="relative mb-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  {step.icon}
                </div>
                {index < integrationSteps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-px bg-border transform -translate-y-1/2"></div>
                )}
              </div>
              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-foreground/70 text-sm">{step.description}</p>
            </div>
          ))}
        </div>
        
        {/* CTA button */}
        <div className="text-center mb-20">
          <TooltipProvider>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="lg" 
                    className="rounded-full px-8 shadow-md hover:shadow-xl transition-all"
                    onClick={handleGetStarted}
                  >
                    Get Started
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex items-center">
                    <Info className="h-4 w-4 mr-2 text-blue-500" />
                    <p>Create an account and connect platforms</p>
                  </div>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="rounded-full px-8 opacity-70 cursor-not-allowed"
                    disabled
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Extension Coming Soon
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-blue-500" />
                    <p>Chrome Extension will be available soon!</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
          <p className="text-sm text-foreground/60 mt-4">Free, lightweight, and secure</p>
        </div>
        
        {/* Supported platforms */}
        <h3 className="text-2xl font-bold text-center mb-10">Supported Platforms</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {supportedPlatforms.map((platform, index) => (
            <div 
              key={index} 
              className="bg-background rounded-xl p-6 border border-border/50 hover:shadow-hover transition-all"
            >
              <div className="flex items-center mb-4">
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
                    {platform.status === 'Ready' ? (
                      <span className="text-green-500 text-sm flex items-center">
                        <Check className="h-3 w-3 mr-1" /> Ready to connect
                      </span>
                    ) : (
                      <span className="text-amber-500 text-sm">{platform.status}</span>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-foreground/70 text-sm mb-4">{platform.description}</p>
              <Button 
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleGetStarted}
              >
                Connect
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PlatformIntegration;
