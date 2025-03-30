
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useMobile } from '@/hooks/use-mobile';
import { Menu, X, LogOut, Image, Settings, User, ExternalLink } from 'lucide-react';

const Navbar = () => {
  const { user, signOut: logout, isLoading } = useAuth();
  const { isMobile } = useMobile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: "Please try again later."
      });
    }
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // Logo click handler - directs to gallery if logged in, otherwise to homepage
  const handleLogoClick = () => {
    if (user) {
      navigate('/gallery');
    } else {
      navigate('/');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-background/80 backdrop-blur-md border-b border-border/40 z-50">
      <nav className="container mx-auto px-4 flex items-center justify-between h-16">
        <button 
          onClick={handleLogoClick} 
          className="flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <div className="bg-primary w-10 h-10 flex items-center justify-center rounded-lg">
            <Image className="text-white w-6 h-6" />
          </div>
          <span className="font-bold text-xl">MainGallery.AI</span>
        </button>

        {/* Mobile menu button */}
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={toggleMenu} className="md:hidden">
            {isOpen ? <X /> : <Menu />}
          </Button>
        )}

        {/* Desktop navigation */}
        <div className={`items-center gap-2 md:flex ${isMobile ? 'hidden' : 'flex'}`}>
          {!isLoading && user ? (
            <>
              <Link to="/gallery" className="hover:text-primary transition-colors px-3 py-2">
                My Gallery
              </Link>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.user_metadata?.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10">
                              {user.email?.charAt(0).toUpperCase() || user.user_metadata?.name?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>
                          {user.user_metadata?.name || user.email || 'Account'}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate('/gallery')}>
                          <Image className="mr-2 h-4 w-4" />
                          <span>My Gallery</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/platforms')}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          <span>Platform Manager</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>
                          <LogOut className="mr-2 h-4 w-4" />
                          <span>Log out</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Account</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          ) : (
            <>
              <Link to="/auth" className="hover:text-primary transition-colors px-3 py-2">
                Login
              </Link>
              <Button asChild>
                <Link to="/auth?signup=true">Sign up</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile navigation */}
        {isMobile && isOpen && (
          <div className="absolute top-16 left-0 right-0 bg-background border-b border-border/40 px-4 py-3 flex flex-col gap-2 md:hidden">
            {!isLoading && user ? (
              <>
                <div className="flex items-center gap-2 p-2">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.user_metadata?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10">
                      {user.email?.charAt(0).toUpperCase() || user.user_metadata?.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.user_metadata?.name || 'User'}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <Link to="/gallery" className="hover:bg-accent hover:text-accent-foreground rounded-md px-3 py-2 transition-colors" onClick={toggleMenu}>
                  My Gallery
                </Link>
                <Link to="/platforms" className="hover:bg-accent hover:text-accent-foreground rounded-md px-3 py-2 transition-colors" onClick={toggleMenu}>
                  Platform Manager
                </Link>
                <Button variant="ghost" className="justify-start px-3" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth" className="hover:bg-accent hover:text-accent-foreground rounded-md px-3 py-2 transition-colors" onClick={toggleMenu}>
                  Login
                </Link>
                <Button asChild onClick={toggleMenu}>
                  <Link to="/auth?signup=true">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
