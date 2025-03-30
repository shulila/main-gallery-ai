import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Handle logo click based on auth state
  const handleLogoClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      // When logged out, navigate to homepage
      navigate('/');
      window.scrollTo(0, 0);
    } else {
      // When logged in, navigate to gallery (this is likely already handled by the Link component)
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-200 ${isScrolled ? 'bg-background/95 backdrop-blur-sm border-b' : 'bg-transparent'}`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to={user ? "/gallery" : "/"} onClick={handleLogoClick} className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="font-semibold text-lg">MainGallery.AI</span>
          </Link>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <nav className="hidden md:flex items-center space-x-6">
                  <Link to="/gallery" className="text-sm font-medium hover:text-primary transition-colors">
                    Gallery
                  </Link>
                  <Link to="/platforms" className="text-sm font-medium hover:text-primary transition-colors">
                    Platforms
                  </Link>
                  <Link to="/settings" className="text-sm font-medium hover:text-primary transition-colors">
                    Settings
                  </Link>
                </nav>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    signOut();
                    navigate('/');
                  }}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm">
                    Log In
                  </Button>
                </Link>
                <Link to="/auth?signup=true">
                  <Button size="sm">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
