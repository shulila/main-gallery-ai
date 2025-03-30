
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const { session, isLoading } = useAuth();
  const navigate = useNavigate();
  const [redirectPath, setRedirectPath] = useState('/gallery');
  const [processingAuth, setProcessingAuth] = useState(true);
  
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
      if (queryParams.has('error') || queryParams.has('code')) {
        return Object.fromEntries(queryParams.entries());
      }
      
      return {};
    };
    
    // Check for parameters that might indicate auth is happening
    const authParams = getHashParams();
    console.log('Auth callback received params:', authParams);
    
    // Check for stored redirect path in session storage
    const storedRedirect = sessionStorage.getItem('oauth_redirect');
    if (storedRedirect) {
      setRedirectPath(storedRedirect);
      sessionStorage.removeItem('oauth_redirect');
    }
    
    // If there's an error, show it and stop
    if (authParams.error) {
      console.error('OAuth error:', authParams.error, authParams.error_description);
      setProcessingAuth(false);
      return;
    }

    // If this is a successful OAuth redirect (we have a code or token)
    // Supabase should automatically handle this - just need to wait for session
    if (authParams.code || authParams.access_token) {
      // Don't need to do anything special, Supabase will process this
      // We just need to ensure we wait long enough for session to be set
      const checkSessionTimer = setTimeout(() => {
        setProcessingAuth(false);
      }, 2000); // Give it 2 seconds maximum
      
      return () => clearTimeout(checkSessionTimer);
    } else {
      // No auth params, nothing to process
      setProcessingAuth(false);
    }
  }, []);

  // When auth processing is done and session is ready, redirect
  useEffect(() => {
    if (!processingAuth && !isLoading && session) {
      navigate(redirectPath);
    } else if (!processingAuth && !isLoading && !session) {
      // If no session after processing, go to login
      navigate('/auth');
    }
  }, [processingAuth, session, isLoading, navigate, redirectPath]);

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
