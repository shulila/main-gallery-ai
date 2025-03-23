
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Auth from '@/components/Auth';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle } from 'lucide-react';

const AuthPage = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get parameters from query string
  const queryParams = new URLSearchParams(location.search);
  const tabParam = queryParams.get('tab');
  const redirectParam = queryParams.get('redirect');
  const fromExtension = queryParams.get('from') === 'extension';
  
  // Redirect to gallery if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      // If there's a redirect parameter, go there
      if (redirectParam) {
        // Check if it's an external URL (like a chrome-extension:// URL)
        if (redirectParam.startsWith('chrome-extension://') || 
            redirectParam.startsWith('http://') || 
            redirectParam.startsWith('https://')) {
          window.location.href = redirectParam;
        } else {
          // For internal routes
          navigate(redirectParam);
        }
      } else if (fromExtension) {
        // If login came from extension, show a message that they can close this tab
        // For this demo, we'll just navigate to gallery with a special parameter
        navigate('/gallery?from=extension');
      } else {
        // Default redirect to gallery
        navigate('/gallery');
      }
    }
  }, [user, isLoading, navigate, redirectParam, fromExtension]);

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 py-16">
        <div className="container mx-auto px-4">
          {fromExtension && (
            <div className="max-w-md mx-auto mb-8 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
              <h2 className="text-lg font-medium mb-2">Connecting from Extension</h2>
              <p className="text-sm text-muted-foreground">
                After logging in, you can close this tab and return to using the extension.
              </p>
            </div>
          )}
          
          <Auth 
            mode="page" 
            redirectTo={fromExtension ? '/gallery?from=extension' : '/gallery'} 
            initialTab={tabParam === 'signup' ? 'signup' : 'login'} 
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AuthPage;
