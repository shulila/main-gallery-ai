
import { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import PlatformIntegration from '@/components/PlatformIntegration';
import Footer from '@/components/Footer';

const Platforms = () => {
  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8 text-center">Platform Integrations</h1>
          <PlatformIntegration />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Platforms;
