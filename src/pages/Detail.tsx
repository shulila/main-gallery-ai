
import { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ImageDetail from '@/components/ImageDetail';
import Footer from '@/components/Footer';

const Detail = () => {
  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24">
        <ImageDetail />
      </main>
      <Footer />
    </div>
  );
};

export default Detail;
