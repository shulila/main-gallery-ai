import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Chrome, CheckCircle, ArrowRight, ExternalLink } from 'lucide-react';

const Start = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isExtensionInstalled, setIsExtensionInstalled] = useState(false);
  const [activeStep, setActiveStep] = useState(1);

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
    
    // Check if extension is installed (simple detection)
    const checkExtension = () => {
      // Check if chrome object exists in window
      if (window.chrome && 'runtime' in window.chrome) {
        try {
          window.chrome.runtime.sendMessage(
            "chrome-extension-id", // Replace with your actual extension ID
            { action: "isInstalled" },
            (response) => {
              if (response && response.installed) {
                setIsExtensionInstalled(true);
                setActiveStep(user ? 3 : 2);
              }
            }
          );
        } catch (e) {
          // Extension not installed or cannot communicate
          console.log("Extension not detected:", e);
        }
      }
    };

    // Simulate extension detection for demo
    setTimeout(() => {
      checkExtension();
    }, 500);

  }, [user]);

  // Handle manual step progression
  useEffect(() => {
    if (user && activeStep < 3) {
      setActiveStep(3);
    }
  }, [user, activeStep]);

  const handleInstallExtension = () => {
    window.open('https://chrome.google.com/webstore/detail/main-gallery/example', '_blank');
    
    toast({
      title: "Installing extension",
      description: "After installation, please refresh this page",
    });
  };

  const handleAuthClick = () => {
    navigate('/auth');
  };

  const handleGoPlatforms = () => {
    navigate('/platforms');
  };

  // Renders a step with appropriate styling based on active state
  const StepIndicator = ({ number, isActive, isComplete }) => (
    <div 
      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 
      ${isComplete ? 'bg-green-500 border-green-500 text-white' : 
        isActive ? 'bg-primary border-primary text-white' : 
        'bg-background border-muted-foreground/30 text-muted-foreground'}`}
    >
      {isComplete ? <CheckCircle className="h-5 w-5" /> : number}
    </div>
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-3xl font-bold mb-2 text-center">Get Started with Main Gallery</h1>
          <p className="text-center text-muted-foreground mb-12">
            Follow these simple steps to connect your AI platforms and build your gallery
          </p>
          
          {/* Steps Progress */}
          <div className="mb-12">
            <div className="flex items-center justify-center">
              <div className="flex items-center">
                <StepIndicator 
                  number={1} 
                  isActive={activeStep === 1} 
                  isComplete={activeStep > 1 || isExtensionInstalled} 
                />
                <div className={`w-20 h-1 ${activeStep > 1 || isExtensionInstalled ? 'bg-primary' : 'bg-muted-foreground/20'}`}></div>
                
                <StepIndicator 
                  number={2} 
                  isActive={activeStep === 2} 
                  isComplete={activeStep > 2 || user} 
                />
                <div className={`w-20 h-1 ${activeStep > 2 ? 'bg-primary' : 'bg-muted-foreground/20'}`}></div>
                
                <StepIndicator 
                  number={3} 
                  isActive={activeStep === 3} 
                  isComplete={false} 
                />
              </div>
            </div>
          </div>
          
          {/* Step Content */}
          <div className="bg-card border rounded-xl p-8 shadow-sm">
            {activeStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">1. Install the Chrome Extension</h2>
                <p className="text-muted-foreground">
                  Our Chrome extension makes it easy to connect your AI platforms to Main Gallery.
                  It helps you save your creations with a single click.
                </p>
                
                <div className="flex items-center justify-center py-6">
                  <Chrome className="w-20 h-20 text-primary" />
                </div>
                
                <div className="flex justify-center">
                  {isExtensionInstalled ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center text-green-500">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        <span className="font-medium">Extension installed!</span>
                      </div>
                      <Button onClick={() => setActiveStep(2)}>Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <Button onClick={handleInstallExtension} className="px-6">
                      <Chrome className="mr-2 h-4 w-4" />
                      Install Chrome Extension
                    </Button>
                  )}
                </div>
                
                <div className="pt-4 text-sm text-center text-muted-foreground">
                  <p>After installation, remember to pin the extension for easy access.</p>
                </div>
              </div>
            )}
            
            {activeStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">2. Create Your Account</h2>
                <p className="text-muted-foreground">
                  Sign up or log in to start building your AI art and video gallery.
                  Your account lets you access your collection from any device.
                </p>
                
                <div className="flex justify-center py-6">
                  {user ? (
                    <div className="flex items-center text-green-500">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      <span className="font-medium">Already logged in as {user.email}</span>
                    </div>
                  ) : (
                    <Button onClick={handleAuthClick} className="px-6">
                      Log In or Sign Up
                    </Button>
                  )}
                </div>
                
                <div className="flex justify-center pt-4">
                  {user && (
                    <Button onClick={() => setActiveStep(3)}>Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  )}
                </div>
              </div>
            )}
            
            {activeStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">3. Connect Your Platforms</h2>
                <p className="text-muted-foreground">
                  Visit any supported AI platform like Midjourney, DALL·E, or Pika. The Main Gallery 
                  button will appear automatically. Click it to add your creations to your gallery.
                </p>
                
                <div className="bg-muted/50 p-4 rounded-lg border">
                  <h3 className="font-medium mb-2">Supported Platforms:</h3>
                  <ul className="grid grid-cols-2 gap-2">
                    <li className="flex items-center"><CheckCircle className="h-3 w-3 text-green-500 mr-2" /> Midjourney</li>
                    <li className="flex items-center"><CheckCircle className="h-3 w-3 text-green-500 mr-2" /> DALL·E</li>
                    <li className="flex items-center"><CheckCircle className="h-3 w-3 text-green-500 mr-2" /> Stable Diffusion</li>
                    <li className="flex items-center"><CheckCircle className="h-3 w-3 text-green-500 mr-2" /> Pika</li>
                    <li className="flex items-center"><CheckCircle className="h-3 w-3 text-green-500 mr-2" /> Runway</li>
                    <li className="flex items-center opacity-50">Leonardo.ai (Coming Soon)</li>
                  </ul>
                </div>
                
                <div className="flex justify-center pt-4">
                  <Button onClick={handleGoPlatforms}>
                    Manage Platforms
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                
                <div className="pt-4 text-sm text-center">
                  <a href="/gallery" className="text-primary hover:underline flex items-center justify-center">
                    Go to my gallery <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Start;
