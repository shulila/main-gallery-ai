
import { Link } from 'react-router-dom';
import { Image, Github, Twitter, Linkedin } from 'lucide-react';
import { brandConfig } from '@/config/brandConfig';

const Footer = () => {
  return (
    <footer className="border-t border-border/50 py-12 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between">
          {/* Brand and description */}
          <div className="md:w-1/3 mb-8 md:mb-0">
            <Link to={brandConfig.routes.home} className="flex items-center space-x-2 mb-4">
              <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center">
                <Image className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-medium">{brandConfig.name}</span>
            </Link>
            <p className="text-foreground/70 text-sm mb-6">
              {brandConfig.tagline}. Connect all your favorite platforms and manage your entire collection in one place.
            </p>
            <div className="flex space-x-4">
              <a href={brandConfig.social.github} target="_blank" rel="noopener noreferrer" className="text-foreground/60 hover:text-primary transition-colors">
                <Github className="h-5 w-5" />
              </a>
              <a href={brandConfig.social.twitter} target="_blank" rel="noopener noreferrer" className="text-foreground/60 hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href={brandConfig.social.linkedin} target="_blank" rel="noopener noreferrer" className="text-foreground/60 hover:text-primary transition-colors">
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
                  <Link to={brandConfig.routes.home} className="text-foreground/70 hover:text-primary text-sm transition-colors">Home</Link>
                </li>
                <li>
                  <Link to={brandConfig.routes.gallery} className="text-foreground/70 hover:text-primary text-sm transition-colors">Gallery</Link>
                </li>
                <li>
                  <Link to={brandConfig.routes.platforms} className="text-foreground/70 hover:text-primary text-sm transition-colors">Platforms</Link>
                </li>
                <li>
                  <Link to="/start" className="text-foreground/70 hover:text-primary text-sm transition-colors">Chrome Extension</Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-3">
                <li>
                  <Link to="/docs" className="text-foreground/70 hover:text-primary text-sm transition-colors">Documentation</Link>
                </li>
                <li>
                  <Link to="/api" className="text-foreground/70 hover:text-primary text-sm transition-colors">API Reference</Link>
                </li>
                <li>
                  <Link to="/changelog" className="text-foreground/70 hover:text-primary text-sm transition-colors">Changelog</Link>
                </li>
                <li>
                  <Link to="/status" className="text-foreground/70 hover:text-primary text-sm transition-colors">Status</Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-3">
                <li>
                  <Link to="/about" className="text-foreground/70 hover:text-primary text-sm transition-colors">About</Link>
                </li>
                <li>
                  <Link to="/blog" className="text-foreground/70 hover:text-primary text-sm transition-colors">Blog</Link>
                </li>
                <li>
                  <Link to="/privacy" className="text-foreground/70 hover:text-primary text-sm transition-colors">Privacy Policy</Link>
                </li>
                <li>
                  <Link to="/terms" className="text-foreground/70 hover:text-primary text-sm transition-colors">Terms of Service</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="border-t border-border/50 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-foreground/60">
          <p>© {new Date().getFullYear()} {brandConfig.name}. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
            <Link to="/cookies" className="hover:text-primary transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
