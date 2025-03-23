import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  Chrome, 
  CheckCircle, 
  ArrowRight, 
  ExternalLink,
  Info,
  Download
} from 'lucide-react';

const Start = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isExtensionInstalled, setIsExtensionInstalled] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get('tab');

  useEffect(() => {
    if (tabParam === 'extension') {
      setActiveStep(2);
    }
  }, [tabParam]);

  useEffect(() => {
    window.scrollTo(0, 0);
    
    const checkExtension = () => {
      if (window.chrome && 'runtime' in window.chrome) {
        try {
          console.warn('Attempting to check if extension is installed...');
          window.chrome.runtime.sendMessage(
            "chrome-extension-id", // Replace with your actual extension ID when published
            { action: "isInstalled" },
            (response) => {
              if (response && response.installed) {
                console.warn('Extension is installed!');
                setIsExtensionInstalled(true);
                setActiveStep(user ? 3 : 2);
              } else {
                console.warn('Extension check returned but not installed');
              }
            }
          );
        } catch (e) {
          console.log("Extension not detected:", e);
        }
      }
    };

    setTimeout(() => {
      checkExtension();
    }, 500);

  }, [user, tabParam]);

  useEffect(() => {
    if (user && activeStep < 3) {
      setActiveStep(3);
    }
  }, [user, activeStep]);

  const handleAuthClick = () => {
    navigate('/auth?tab=login');
  };

  const handleGoPlatforms = () => {
    navigate('/platforms');
  };

  const handleGoToGallery = () => {
    navigate('/gallery');
  };
  
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
          
          {showSuccess && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-xl flex flex-col items-center animate-in fade-in-90 slide-in-from-bottom-10 duration-300">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-300" />
                </div>
                <h2 className="text-xl font-semibold mb-2">You're all set!</h2>
                <p className="text-muted-foreground mb-4">Redirecting to your gallery...</p>
              </div>
            </div>
          )}
          
          <div className="mb-12">
            <div className="flex items-center justify-center">
              <div className="flex items-center">
                <StepIndicator 
                  number={1} 
                  isActive={activeStep === 1} 
                  isComplete={activeStep > 1 || user} 
                />
                <div className={`w-20 h-1 ${activeStep > 1 || user ? 'bg-primary' : 'bg-muted-foreground/20'}`}></div>
                
                <StepIndicator 
                  number={2} 
                  isActive={activeStep === 2} 
                  isComplete={activeStep > 2} 
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
          
          <div className="bg-card border rounded-xl p-8 shadow-sm">
            {activeStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">1. Create Your Account</h2>
                <p className="text-muted-foreground">
                  Main Gallery helps you collect and organize all your AI-generated art in one place. 
                  Start by creating an account to access your personalized gallery.
                </p>
                
                <div className="bg-muted/50 p-4 rounded-lg border mt-4">
                  <h3 className="font-medium mb-2">What you'll be able to do:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center"><CheckCircle className="h-3 w-3 text-green-500 mr-2" /> Save AI art from multiple platforms</li>
                    <li className="flex items-center"><CheckCircle className="h-3 w-3 text-green-500 mr-2" /> Organize your creations in one gallery</li>
                    <li className="flex items-center"><CheckCircle className="h-3 w-3 text-green-500 mr-2" /> Access your collection from any device</li>
                  </ul>
                </div>
                
                <div className="flex justify-center py-4">
                  {user ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center text-green-500">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        <span className="font-medium">Already logged in as {user.email}</span>
                      </div>
                      <Button onClick={() => setActiveStep(2)} className="bg-blue-500 hover:bg-blue-600">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <Button onClick={handleAuthClick} className="px-6 bg-blue-500 hover:bg-blue-600">
                      Log In or Sign Up
                    </Button>
                  )}
                </div>
              </div>
            )}
            
            {activeStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">2. Chrome Extension</h2>
                <p className="text-muted-foreground">
                  Our Chrome extension makes it easy to save your AI creations with a single click 
                  directly from platforms like Midjourney, DALL·E, and others.
                </p>
                
                <div className="flex items-center justify-center py-6">
                  <Chrome className="w-20 h-20 text-primary" />
                </div>
                
                <div className="flex flex-col items-center justify-center gap-4">
                  {isExtensionInstalled ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center text-green-500">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        <span className="font-medium">Extension installed!</span>
                      </div>
                      <Button onClick={() => setActiveStep(3)} className="bg-blue-500 hover:bg-blue-600">
                        Continue <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center max-w-md">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Info className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">Coming Soon</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Our Chrome extension will be available in the Chrome Web Store soon.
                          You can continue using Main Gallery without it for now, and we'll
                          notify you when it's ready.
                        </p>
                      </div>
                      
                      <Button onClick={() => setActiveStep(3)} className="bg-blue-500 hover:bg-blue-600">
                        Continue Without Extension <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {activeStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">3. Connect Your Platforms</h2>
                <p className="text-muted-foreground">
                  You're ready to start collecting! Visit any supported AI platform, and use the MainGallery 
                  extension to add your creations to your gallery with a single click.
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
                
                <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                  <Button onClick={handleGoPlatforms} className="bg-blue-500 hover:bg-blue-600">
                    Manage Platforms
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  
                  <Button variant="outline" onClick={handleGoToGallery}>
                    Go to My Gallery
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
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
