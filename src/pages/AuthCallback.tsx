
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const { session, isLoading } = useAuth();
  const navigate = useNavigate();
  const [redirectPath, setRedirectPath] = useState('/gallery');
  
  useEffect(() => {
    // Function to parse the hash fragment or query parameters
    const getHashParams = () => {
      // Check if there are fragment parameters
      const hashParams = window.location.hash.substring(1);
      if (hashParams) {
        const urlParams = new URLSearchParams(hashParams);
        return Object.fromEntries(urlParams.entries());
      }
      
      // Check if there are query parameters
      const queryParams = new URLSearchParams(window.location.search);
      if (queryParams.has('error') || queryParams.has('access_token')) {
        return Object.fromEntries(queryParams.entries());
      }
      
      return {};
    };
    
    // Get params
    const params = getHashParams();
    
    // Check for stored redirect path in session storage
    const storedRedirect = sessionStorage.getItem('oauth_redirect');
    if (storedRedirect) {
      setRedirectPath(storedRedirect);
      sessionStorage.removeItem('oauth_redirect');
    }
    
    // If there's an error, show it and stop
    if (params.error) {
      console.error('OAuth error:', params.error, params.error_description);
      return;
    }
    
    // If user is logged in, redirect them
    if (session && !isLoading) {
      navigate(redirectPath);
    }
  }, [session, isLoading, navigate, redirectPath]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <h2 className="text-2xl font-bold">Completing Authentication</h2>
          <p className="text-muted-foreground">
            Please wait while we finish setting up your account...
          </p>
        </div>
      </Card>
    </div>
  );
};

export default AuthCallback;
