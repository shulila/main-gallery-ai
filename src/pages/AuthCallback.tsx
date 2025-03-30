
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * Auth callback page for handling redirects from OAuth providers
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const processCallback = async () => {
      try {
        console.log('Processing auth callback');
        setProcessing(true);

        // If there's an error parameter, handle it
        const searchParams = new URLSearchParams(location.search);
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (errorParam) {
          console.error('Auth error:', errorParam, errorDescription);
          setError(errorDescription || 'Authentication failed');
          return;
        }

        // Check for type=recovery for password reset
        const type = searchParams.get('type');
        if (type === 'recovery') {
          console.log('Password recovery flow detected');
          navigate('/auth?recovery=true');
          return;
        }

        // Handle hash fragment (used by OAuth providers like Google)
        if (location.hash) {
          console.log('Hash fragment detected in callback URL:', location.hash);
          
          // Extract user info if available - specifically for Chrome extension auth flow
          const params = new URLSearchParams(location.hash.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          const userEmail = params.get('email');
          
          // For Chrome extension auth flow
          if (window.opener === null && accessToken) {
            console.log('Extension flow detected with access token');
            
            // Store auth data in localStorage for extension to access
            try {
              localStorage.setItem('main_gallery_auth_token', JSON.stringify({
                access_token: accessToken,
                refresh_token: refreshToken,
                timestamp: Date.now()
              }));
              
              if (userEmail) {
                localStorage.setItem('main_gallery_user_email', userEmail);
              }
              
              console.log('Access token stored in localStorage for extension to access');
            } catch (storageError) {
              console.error('Error storing auth data:', storageError);
            }
            
            // In extension flow, just navigate to the gallery
            console.log('Redirecting to gallery');
            navigate('/gallery');
          } else {
            console.log('Regular web app flow with hash, redirecting to gallery');
            // We know the auth update was handled by Supabase client, just navigate
            navigate('/gallery');
          }
        } else {
          console.log('No hash fragment, redirecting to gallery');
          // No hash but we got here, assume success and navigate
          navigate('/gallery');
        }
      } catch (err: any) {
        console.error('Error processing auth callback:', err);
        setError(err.message || 'An error occurred during authentication');
      } finally {
        setProcessing(false);
      }
    };

    processCallback();
  }, [location, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 space-y-4 bg-white rounded-lg shadow-lg">
        {processing ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h2 className="text-2xl font-bold text-center">
              Completing authentication...
            </h2>
            <p className="text-center text-muted-foreground">
              Please wait while we process your login
            </p>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-center text-destructive">
              Authentication Error
            </h2>
            <p className="text-center">{error}</p>
            <div className="flex justify-center">
              <button
                onClick={() => navigate('/auth')}
                className="px-4 py-2 bg-primary text-white rounded-md"
              >
                Return to Login
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-center">Login Successful</h2>
            <p className="text-center text-muted-foreground">
              You have been successfully authenticated. Redirecting...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
