
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { brandConfig } from '@/config/brandConfig';

const featureDetails = {
  'one-click-connection': {
    title: 'One-Click Connection',
    description: 'Seamlessly connect to Midjourney, DALL·E, Runway, Pika, and others with our Chrome extension.',
    content: 'Our Chrome extension allows you to connect to all your favorite AI art platforms with just one click. No complicated setup or configuration required. Simply install the extension, navigate to your AI platform, and click "Add to Main Gallery".'
  },
  'secure-access': {
    title: 'Secure Access',
    description: 'Your API tokens and OAuth credentials are securely stored with industry-standard encryption.',
    content: 'Security is our top priority. We use industry-standard encryption to protect your API tokens and OAuth credentials. Your data is never shared with third parties, and you can revoke access at any time.'
  },
  'real-time-sync': {
    title: 'Real-Time Sync',
    description: 'See your latest creations instantly without transferring or uploading any files.',
    content: 'With real-time synchronization, your latest AI creations appear in your Main Gallery instantly. There\'s no need to manually transfer or upload files, saving you time and keeping your collection always up-to-date.'
  },
  'complete-metadata': {
    title: 'Complete Metadata',
    description: 'View all image details including prompts, models, creation dates, and technical parameters.',
    content: 'Every detail matters. Main Gallery preserves all metadata from your AI creations, including prompts, model details, creation dates, and technical parameters. This makes it easier to track your progress and reproduce successful results.'
  },
  'copy-prompts': {
    title: 'Copy Prompts',
    description: 'Easily reuse successful prompts across different AI image generation platforms.',
    content: 'Found a prompt that works well? With our prompt copying feature, you can easily reuse successful prompts across different AI image generation platforms, saving you time and ensuring consistent results.'
  },
  'quick-downloads': {
    title: 'Quick Downloads',
    description: 'Download any of your creations directly from the unified gallery with a single click.',
    content: 'Access your creations anywhere. Download any of your AI-generated artwork directly from Main Gallery with a single click, making it easy to share your work or use it in other projects.'
  }
};

const FeatureDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const feature = slug && featureDetails[slug as keyof typeof featureDetails];
  
  if (!feature) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="container mx-auto px-4 py-24">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-6">Feature not found</h1>
            <Button onClick={() => navigate('/')}>Return to Home</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24">
        <div className="container mx-auto px-4 py-12">
          <Button 
            variant="ghost" 
            className="mb-8" 
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          
          <div className="max-w-3xl mx-auto">
            <div className="mb-10">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">{feature.title}</h1>
              <p className="text-xl text-foreground/80">{feature.description}</p>
            </div>
            
            <div className="prose prose-lg max-w-none">
              <p>{feature.content}</p>
              <p className="mt-6">
                With {brandConfig.name}, you can organize, view, and manage all your AI-generated artwork in one place.
                Our platform is designed to streamline your creative workflow and help you get the most out of your AI art tools.
              </p>
              
              <h2 className="text-2xl font-bold mt-10 mb-4">Get Started Today</h2>
              <p>
                Ready to centralize your AI art collection? Sign up for {brandConfig.name} today and start connecting
                your favorite AI art platforms with our easy-to-use Chrome extension.
              </p>
              
              <div className="mt-10">
                <Button 
                  size="lg" 
                  onClick={() => navigate(brandConfig.routes.auth)}
                >
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FeatureDetail;
