
import { Link } from 'react-router-dom';
import { Image, Github, Twitter, Linkedin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="border-t border-border/50 py-12 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between">
          {/* Brand and description */}
          <div className="md:w-1/3 mb-8 md:mb-0">
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center">
                <Image className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-medium">MainGallery</span>
            </Link>
            <p className="text-foreground/70 text-sm mb-6">
              The unified gallery for all your AI-generated art. Connect all your favorite platforms and manage your entire collection in one place.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-foreground/60 hover:text-primary transition-colors">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="text-foreground/60 hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-foreground/60 hover:text-primary transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>
          
          {/* Navigation links */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-3">
                <li>
                  <Link to="/" className="text-foreground/70 hover:text-primary text-sm transition-colors">Home</Link>
                </li>
                <li>
                  <Link to="/gallery" className="text-foreground/70 hover:text-primary text-sm transition-colors">Gallery</Link>
                </li>
                <li>
                  <Link to="/platforms" className="text-foreground/70 hover:text-primary text-sm transition-colors">Platforms</Link>
                </li>
                <li>
                  <a href="#" className="text-foreground/70 hover:text-primary text-sm transition-colors">Chrome Extension</a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-foreground/70 hover:text-primary text-sm transition-colors">Documentation</a>
                </li>
                <li>
                  <a href="#" className="text-foreground/70 hover:text-primary text-sm transition-colors">API Reference</a>
                </li>
                <li>
                  <a href="#" className="text-foreground/70 hover:text-primary text-sm transition-colors">Changelog</a>
                </li>
                <li>
                  <a href="#" className="text-foreground/70 hover:text-primary text-sm transition-colors">Status</a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-foreground/70 hover:text-primary text-sm transition-colors">About</a>
                </li>
                <li>
                  <a href="#" className="text-foreground/70 hover:text-primary text-sm transition-colors">Blog</a>
                </li>
                <li>
                  <a href="#" className="text-foreground/70 hover:text-primary text-sm transition-colors">Privacy Policy</a>
                </li>
                <li>
                  <a href="#" className="text-foreground/70 hover:text-primary text-sm transition-colors">Terms of Service</a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="border-t border-border/50 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-foreground/60">
          <p>© {new Date().getFullYear()} MainGallery. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-primary transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
