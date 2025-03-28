
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import PlatformIntegration from '@/components/PlatformIntegration';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import ConnectedPlatforms from '@/components/ConnectedPlatforms';

const Platforms = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

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
            // Logged in user sees the connected platforms management view
            <>
              <h1 className="text-3xl font-bold mb-2 text-center">Platform Manager</h1>
              <p className="text-muted-foreground text-center mb-8">Connect and manage your AI platforms</p>
              <ConnectedPlatforms />
            </>
          ) : (
            // Not logged in user sees integration explanation
            <>
              <h1 className="text-3xl font-bold mb-2 text-center">Platform Integrations</h1>
              <p className="text-muted-foreground text-center mb-8">Connect your favorite AI platforms to MainGallery</p>
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
