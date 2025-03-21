
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import PlatformIntegration from '@/components/PlatformIntegration';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <PlatformIntegration />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
