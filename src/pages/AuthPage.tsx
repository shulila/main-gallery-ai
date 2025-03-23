
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Auth from '@/components/Auth';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';

const AuthPage = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the tab from query parameters
  const queryParams = new URLSearchParams(location.search);
  const tabParam = queryParams.get('tab');
  const redirectParam = queryParams.get('redirect');
  
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
      } else {
        navigate('/gallery');
      }
    }
  }, [user, isLoading, navigate, redirectParam]);

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 py-16">
        <div className="container mx-auto px-4">
          <Auth 
            mode="page" 
            redirectTo={redirectParam || "/gallery"} 
            initialTab={tabParam === 'signup' ? 'signup' : 'login'} 
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AuthPage;
