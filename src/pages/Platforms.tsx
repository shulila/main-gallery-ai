
import { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import PlatformIntegration from '@/components/PlatformIntegration';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import ConnectedPlatforms from '@/components/ConnectedPlatforms';

const Platforms = () => {
  const { user } = useAuth();

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24">
        <div className="container mx-auto px-4 py-8">
          {user ? (
            // Logged in user sees connected platforms management view
            <>
              <h1 className="text-3xl font-bold mb-8 text-center">Connected Platforms</h1>
              <ConnectedPlatforms />
            </>
          ) : (
            // Not logged in user sees integration explanation
            <>
              <h1 className="text-3xl font-bold mb-8 text-center">Platform Integrations</h1>
              <PlatformIntegration />
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Platforms;
