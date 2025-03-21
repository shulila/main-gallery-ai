
import { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import GalleryView from '@/components/GalleryView';
import Footer from '@/components/Footer';

const Gallery = () => {
  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
