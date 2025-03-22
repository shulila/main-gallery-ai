
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import ImageDetail from '@/components/ImageDetail';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';

const Detail = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  
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
        <ImageDetail />
      </main>
      <Footer />
    </div>
  );
};

export default Detail;
