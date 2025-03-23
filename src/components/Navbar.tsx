
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Menu, X, User, Image as ImageIcon, LogOut } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { brandConfig } from '@/config/brandConfig';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate(brandConfig.routes.home);
  };

  const isActive = (path: string) => location.pathname === path;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (sectionId: string) => {
    // First check if we're on the homepage
    if (location.pathname !== brandConfig.routes.home) {
      navigate(`${brandConfig.routes.home}#${sectionId}`);
      return;
    }
    
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    if (location.pathname === brandConfig.routes.home) {
      e.preventDefault();
      scrollToTop();
    }
  };

  const handleHomeClick = (e: React.MouseEvent) => {
    if (location.pathname === brandConfig.routes.home) {
      e.preventDefault();
      scrollToTop();
    }
  };

  const handleHowItWorksClick = (e: React.MouseEvent) => {
    e.preventDefault();
    scrollToSection('how-it-works');
  };

  const handleAuth = (tab: string) => {
    navigate(`${brandConfig.routes.auth}?tab=${tab}`);
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-subtle' : 'bg-transparent'
    }`}>
      <div className="container mx-auto px-4 md:px-6 py-4">
        <div className="flex items-center justify-between">
          <Link 
            to={brandConfig.routes.home} 
            className="flex items-center space-x-2"
            onClick={handleLogoClick}
          >
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <ImageIcon className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-medium">{brandConfig.name}</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {/* Only show Home and How It Works for non-logged in users */}
            {!user && (
              <>
                <Link 
                  to={brandConfig.routes.home} 
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    isActive(brandConfig.routes.home) ? 'text-primary' : 'text-foreground/80'
                  }`}
                  onClick={handleHomeClick}
                >
                  Home
                </Link>
                <a 
                  href="#how-it-works"
                  className="text-sm font-medium transition-colors hover:text-primary text-foreground/80"
                  onClick={handleHowItWorksClick}
                >
                  How It Works
                </a>
              </>
            )}
            {user && (
              <Link to={brandConfig.routes.gallery} className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive(brandConfig.routes.gallery) ? 'text-primary' : 'text-foreground/80'
              }`}>
                My Gallery
              </Link>
            )}
            {user ? (
              <Link 
                to={brandConfig.routes.platforms} 
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive(brandConfig.routes.platforms) ? 'text-primary' : 'text-foreground/80'
                }`}
              >
                Connected Platforms
              </Link>
            ) : (
              <Link 
                to={brandConfig.routes.home} 
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive(brandConfig.routes.platforms) ? 'text-primary' : 'text-foreground/80'
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('platforms');
                }}
              >
                Platforms
              </Link>
            )}
          </nav>
          
          {/* Authentication Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-full">
                    <User className="h-4 w-4 mr-2" />
                    {user.email?.split('@')[0] || 'Account'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(brandConfig.routes.gallery)}>
                    My Gallery
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(brandConfig.routes.platforms)}>
                    Connected Platforms
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-full" 
                  onClick={() => handleAuth('login')}
                >
                  Log in
                </Button>
                <Button 
                  size="sm" 
                  className="rounded-full" 
                  onClick={() => handleAuth('signup')}
                >
                  Sign up
                </Button>
              </>
            )}
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
              {/* Only show Home and How It Works for non-logged in users in mobile menu too */}
              {!user && (
                <>
                  <Link 
                    to={brandConfig.routes.home}
                    className="flex items-center space-x-2 p-2 rounded-md hover:bg-secondary"
                    onClick={(e) => {
                      setIsMobileMenuOpen(false);
                      handleHomeClick(e);
                    }}
                  >
                    <ImageIcon size={18} />
                    <span>Home</span>
                  </Link>
                  <a 
                    href="#how-it-works"
                    className="flex items-center space-x-2 p-2 rounded-md hover:bg-secondary"
                    onClick={(e) => {
                      setIsMobileMenuOpen(false);
                      handleHowItWorksClick(e);
                    }}
                  >
                    <ImageIcon size={18} />
                    <span>How It Works</span>
                  </a>
                </>
              )}
              {user && (
                <Link 
                  to={brandConfig.routes.gallery}
                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-secondary"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <ImageIcon size={18} />
                  <span>My Gallery</span>
                </Link>
              )}
              {user ? (
                <Link 
                  to={brandConfig.routes.platforms}
                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-secondary"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <User size={18} />
                  <span>Connected Platforms</span>
                </Link>
              ) : (
                <a
                  href="#platforms"
                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-secondary"
                  onClick={(e) => {
                    setIsMobileMenuOpen(false);
                    e.preventDefault();
                    scrollToSection('platforms');
                  }}
                >
                  <User size={18} />
                  <span>Platforms</span>
                </a>
              )}
              <div className="pt-4 mt-4 border-t border-border/50 flex flex-col space-y-2">
                {user ? (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    size="sm"
                    onClick={() => {
                      handleSignOut();
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Log out
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                      size="sm"
                      onClick={() => {
                        handleAuth('login');
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      Log in
                    </Button>
                    <Button 
                      className="w-full justify-start" 
                      size="sm"
                      onClick={() => {
                        handleAuth('signup');
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      Sign up
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
