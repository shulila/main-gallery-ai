
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Menu, X, User, Image, Home } from "lucide-react";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-subtle' : 'bg-transparent'
    }`}>
      <div className="container mx-auto px-4 md:px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <Image className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-medium">MainGallery</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/') ? 'text-primary' : 'text-foreground/80'
            }`}>
              Home
            </Link>
            <Link to="/gallery" className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/gallery') ? 'text-primary' : 'text-foreground/80'
            }`}>
              Gallery
            </Link>
            <Link to="/platforms" className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/platforms') ? 'text-primary' : 'text-foreground/80'
            }`}>
              Platforms
            </Link>
          </nav>
          
          {/* Authentication Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="outline" size="sm" className="rounded-full">
              Log in
            </Button>
            <Button size="sm" className="rounded-full">
              Sign up
            </Button>
          </div>
          
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden rounded-md p-2 text-foreground/80 hover:bg-secondary"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-background border-t border-border/50 py-4 animate-fade-in">
          <div className="container mx-auto px-4">
            <nav className="flex flex-col space-y-4">
              <Link 
                to="/" 
                className="flex items-center space-x-2 p-2 rounded-md hover:bg-secondary"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Home size={18} />
                <span>Home</span>
              </Link>
              <Link 
                to="/gallery" 
                className="flex items-center space-x-2 p-2 rounded-md hover:bg-secondary"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Image size={18} />
                <span>Gallery</span>
              </Link>
              <Link 
                to="/platforms" 
                className="flex items-center space-x-2 p-2 rounded-md hover:bg-secondary"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <User size={18} />
                <span>Platforms</span>
              </Link>
              <div className="pt-4 mt-4 border-t border-border/50 flex flex-col space-y-2">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  Log in
                </Button>
                <Button className="w-full justify-start" size="sm">
                  Sign up
                </Button>
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
