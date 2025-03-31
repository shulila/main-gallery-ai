
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import GalleryView from '@/components/GalleryView';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const Gallery = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Extension integration notification
  useEffect(() => {
    // Check if the page was loaded by the extension
    const fromExtension = new URLSearchParams(window.location.search).get('from') === 'extension';
    
    if (fromExtension) {
      toast({
        title: "Extension Connected",
        description: "MainGallery extension is ready to sync images",
        duration: 3000,
      });
    }
    
    // Notify bridge that page is ready (if extension is installed)
    window.postMessage({
      type: 'GALLERY_PAGE_READY',
      timestamp: Date.now()
    }, '*');
  }, []);
  
  // Redirect to auth page if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via the useEffect
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24">
        <GalleryView />
      </main>
      <Footer />
    </div>
  );
};

export default Gallery;
