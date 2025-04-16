
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  
  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/');
      window.scrollTo(0, 0);
    } else {
      navigate('/gallery');
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
            <img 
              src="/assets/icons/logo-icon-only.svg" 
              alt="MainGallery.AI Logo" 
              className="w-8 h-8 rounded-lg"
              width={32}
              height={32}
            />
            <span className="font-semibold text-lg">MainGallery.AI</span>
          </Link>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <nav className="hidden md:flex items-center space-x-6">
                  {/* Gallery link removed as logo navigates there */}
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
