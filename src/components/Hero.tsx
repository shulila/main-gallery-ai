import { ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { brandConfig } from '@/config/brandConfig';
import { useAuth } from '@/contexts/AuthContext';

const Hero = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      // If user is logged in, take them to gallery
      navigate(brandConfig.routes.gallery);
    } else {
      // Otherwise take them to auth page
      navigate(brandConfig.routes.auth);
    }
  };

  const handleHowItWorks = () => {
    // For now, use an anchor link to scroll to a section
    const howItWorksSection = document.getElementById('how-it-works');
    if (howItWorksSection) {
      howItWorksSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      // Fallback to the route defined in config
      navigate(brandConfig.routes.howItWorks);
    }
  };

  return (
    <section className="relative overflow-hidden pt-32 pb-16 md:pt-40 md:pb-24 min-h-[85vh] flex items-center">
      {/* Background gradient */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-primary/5 to-background"></div>
      
      {/* Animated shapes */}
      <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col md:flex-row items-center text-center md:text-left">
          <div className="md:w-1/2 md:pr-8 mb-10 md:mb-0 animate-slide-up [animation-delay:0.1s] opacity-0" style={{ animationFillMode: 'forwards' }}>
            <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              All your AI creations in one place
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
              Your unified gallery for <span className="text-primary">AI-generated art</span>
            </h1>
            <p className="text-lg text-foreground/80 mb-8 max-w-xl">
              {brandConfig.description}
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 justify-center md:justify-start">
              <Button size="lg" className="rounded-full px-8 shadow-md hover:shadow-xl transition-all group" onClick={handleGetStarted}>
                Get Started
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="lg" className="rounded-full px-8" onClick={handleHowItWorks}>
                How It Works
              </Button>
            </div>
          </div>
          
          {/* Hero Image */}
          <div className="md:w-1/2 animate-scale-in [animation-delay:0.3s] opacity-0" style={{ animationFillMode: 'forwards' }}>
            <div className="relative">
              <div className="bg-gradient-to-tr from-primary/20 to-primary/5 rounded-3xl p-1">
                <div className="glass rounded-2xl overflow-hidden shadow-xl">
                  <div className="aspect-video bg-muted/30">
                    <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-2 p-4">
                      {[...Array(9)].map((_, index) => (
                        <div 
                          key={index} 
                          className="rounded-lg bg-gradient-to-tr from-muted/80 to-muted/40 animate-pulse"
                          style={{ animationDelay: `${index * 0.1}s`, animationDuration: '2s' }}
                        ></div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      <div className="w-2 h-2 rounded-full bg-muted"></div>
                      <div className="w-2 h-2 rounded-full bg-muted"></div>
                    </div>
                    <div className="h-3 w-24 bg-muted/50 rounded-full"></div>
                  </div>
                </div>
              </div>
              
              {/* Floating UI elements */}
              <div className="absolute -top-6 -right-6 glass p-3 rounded-xl shadow-md animate-float" style={{ animationDelay: '0.5s' }}>
                <div className="h-3 w-20 bg-primary/20 rounded-full mb-2"></div>
                <div className="h-3 w-14 bg-muted/50 rounded-full"></div>
              </div>
              
              <div className="absolute -bottom-8 -left-8 glass p-4 rounded-xl shadow-md animate-float" style={{ animationDelay: '1.2s' }}>
                <div className="flex space-x-2 items-center">
                  <div className="w-6 h-6 rounded-full bg-primary/30"></div>
                  <div>
                    <div className="h-2 w-16 bg-primary/20 rounded-full mb-1"></div>
                    <div className="h-2 w-10 bg-muted/50 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
