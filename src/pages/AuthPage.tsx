
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Auth from '@/components/Auth';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';

const AuthPage = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  
  // Redirect to gallery if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      navigate('/gallery');
    }
  }, [user, isLoading, navigate]);

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 py-16">
        <div className="container mx-auto px-4">
          <Auth mode="page" />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AuthPage;
