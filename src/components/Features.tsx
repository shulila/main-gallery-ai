
import { ArrowRight, Zap, Globe, Lock, Image, Copy, Download, Info, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { brandConfig } from '@/config/brandConfig';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Features = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Globe className="h-6 w-6 text-primary" />,
      title: "One-Click Connection",
      description: "Seamlessly connect to Midjourney, DALL·E, Runway, Pika, and others with our Chrome extension.",
      slug: "one-click-connection"
    },
    {
      icon: <Lock className="h-6 w-6 text-primary" />,
      title: "Secure Access",
      description: "Your API tokens and OAuth credentials are securely stored with industry-standard encryption.",
      slug: "secure-access"
    },
    {
      icon: <Zap className="h-6 w-6 text-primary" />,
      title: "Real-Time Sync",
      description: "See your latest creations instantly without transferring or uploading any files.",
      slug: "real-time-sync"
    },
    {
      icon: <Image className="h-6 w-6 text-primary" />,
      title: "Complete Metadata",
      description: "View all image details including prompts, models, creation dates, and technical parameters.",
      slug: "complete-metadata"
    },
    {
      icon: <Copy className="h-6 w-6 text-primary" />,
      title: "Copy Prompts",
      description: "Easily reuse successful prompts across different AI image generation platforms.",
      slug: "copy-prompts"
    },
    {
      icon: <Download className="h-6 w-6 text-primary" />,
      title: "Quick Downloads",
      description: "Download any of your creations directly from the unified gallery with a single click.",
      slug: "quick-downloads"
    }
  ];

  const handleLearnMore = (featureSlug: string) => {
    navigate(`/features/${featureSlug}`);
  };

  const handleGetStarted = () => {
    // Navigate to start page
    navigate('/start');
  };

  return (
    <section id="how-it-works" className="py-20 bg-secondary/50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            Powerful Features
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
            Everything you need for your AI art collection
          </h2>
          <p className="text-lg text-foreground/80">
            {brandConfig.name} brings all your AI-generated creations together with powerful organization and sharing tools.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="bg-background rounded-2xl p-6 shadow-subtle hover:shadow-hover transition-all duration-300 border border-border/50"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-foreground/80 mb-4">{feature.description}</p>
              <button 
                onClick={() => handleLearnMore(feature.slug)} 
                className="inline-flex items-center text-primary font-medium hover:underline"
              >
                Learn more <ArrowRight className="ml-1 h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        
        <div className="mt-20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl p-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-6 md:mb-0 md:pr-8">
              <h3 className="text-2xl font-bold mb-2">Ready to centralize your AI art?</h3>
              <p className="text-foreground/80">Get started with {brandConfig.name} in just a few clicks.</p>
            </div>
            <TooltipProvider>
              <div className="flex flex-col sm:flex-row gap-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      onClick={handleGetStarted}
                      className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground px-8 py-3 font-medium hover:bg-primary/90 transition-colors"
                    >
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </button>
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
                    <button 
                      disabled
                      className="inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-500 px-8 py-3 font-medium opacity-70 cursor-not-allowed"
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Extension Coming Soon
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-blue-500" />
                      <p>Our Chrome Extension will be available soon!</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
