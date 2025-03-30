
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AuthCallback = () => {
  const { session, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [redirectPath, setRedirectPath] = useState('/gallery');
  const [processingAuth, setProcessingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Function to parse the hash fragment or query parameters
    const getHashParams = () => {
      console.log('Parsing hash or query params');
      
      // Check if there are fragment parameters
      const hashParams = window.location.hash.substring(1);
      if (hashParams) {
        console.log('Found hash fragment parameters:', hashParams);
        const urlParams = new URLSearchParams(hashParams);
        return Object.fromEntries(urlParams.entries());
      }
      
      // Check if there are query parameters
      const queryParams = new URLSearchParams(window.location.search);
      if (queryParams.has('error') || queryParams.has('code')) {
        console.log('Found query parameters:', queryParams.toString());
        return Object.fromEntries(queryParams.entries());
      }
      
      console.log('No auth parameters found in URL');
      return {};
    };
    
    // Check for parameters that might indicate auth is happening
    const authParams = getHashParams();
    console.log('Auth callback received params:', authParams);
    
    // Check for stored redirect path in session storage
    const storedRedirect = sessionStorage.getItem('oauth_redirect');
    if (storedRedirect) {
      console.log('Found stored redirect path:', storedRedirect);
      setRedirectPath(storedRedirect);
      sessionStorage.removeItem('oauth_redirect');
    }
    
    // If there's an error, show it and stop
    if (authParams.error) {
      console.error('OAuth error:', authParams.error, authParams.error_description);
      setError(`Auth error: ${authParams.error} - ${authParams.error_description || 'Unknown error'}`);
      setProcessingAuth(false);
      toast({
        title: "Authentication Error",
        description: authParams.error_description || authParams.error,
        variant: "destructive",
      });
      return;
    }

    // If this is a successful OAuth redirect (we have a code or token)
    // Supabase should automatically handle this - just need to wait for session
    if (authParams.code || authParams.access_token) {
      console.log('Auth code or token found, waiting for Supabase to process');
      // Don't need to do anything special, Supabase will process this
      // We just need to ensure we wait long enough for session to be set
      const checkSessionTimer = setTimeout(() => {
        console.log('Auth processing timeout reached');
        setProcessingAuth(false);
      }, 5000); // Give it 5 seconds maximum to ensure we don't get stuck
      
      return () => clearTimeout(checkSessionTimer);
    } else {
      // No auth params, nothing to process
      console.log('No auth parameters to process');
      setProcessingAuth(false);
    }
  }, [toast]);

  // When auth processing is done and session is ready, redirect
  useEffect(() => {
    if (!processingAuth && !isLoading) {
      if (session) {
        console.log('Auth complete, redirecting to:', redirectPath);
        navigate(redirectPath);
      } else {
        // If no session after processing, go to login
        console.log('No session after auth processing, redirecting to login');
        navigate('/auth');
      }
    }
  }, [processingAuth, session, isLoading, navigate, redirectPath]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          {error ? (
            <>
              <div className="text-red-500 text-3xl mb-2">⚠️</div>
              <h2 className="text-2xl font-bold text-destructive">Authentication Failed</h2>
              <p className="text-muted-foreground">{error}</p>
              <button 
                onClick={() => navigate('/auth')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Go to Login
              </button>
            </>
          ) : (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <h2 className="text-2xl font-bold">Completing Authentication</h2>
              <p className="text-muted-foreground">
                Please wait while we finish setting up your account...
              </p>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AuthCallback;
