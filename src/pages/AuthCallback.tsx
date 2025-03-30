
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const processAuthCallback = async () => {
      try {
        console.log("Processing auth callback");
        
        // Get hash and query parameters
        const hash = window.location.hash;
        const queryParams = Object.fromEntries(searchParams.entries());
        
        console.log("Auth callback hash:", hash);
        console.log("Auth callback query params:", queryParams);
        
        if (queryParams.error) {
          throw new Error(`Authentication error: ${queryParams.error_description || queryParams.error}`);
        }
        
        // Handle hash fragments for token (for OAuth providers like Google)
        if (hash && hash.includes('access_token')) {
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token') || '';
          const email = hashParams.get('email') || '';
          
          if (accessToken) {
            console.log('Got access token from hash');
            
            // Store the token in localStorage for web app use
            localStorage.setItem('main_gallery_auth_token', JSON.stringify({
              access_token: accessToken,
              refresh_token: refreshToken,
              timestamp: Date.now()
            }));
            
            // Also store user email if available
            if (email) {
              localStorage.setItem('main_gallery_user_email', email);
            }
            
            // Check if this was a Chrome extension auth attempt
            const fromExtension = queryParams.from === 'extension' || hashParams.get('from') === 'extension';
            
            // Determine redirect path, defaulting to gallery
            const redirectPath = queryParams.redirect || hashParams.get('redirect') || '/gallery';
            
            // Log the redirect path for debugging
            console.log('Redirecting to:', redirectPath);
            
            // Small delay to ensure storage is complete
            setTimeout(() => {
              // Check if redirect is to an external URL (like chrome-extension://)
              if (redirectPath.startsWith('chrome-extension://') || 
                  redirectPath.startsWith('http://') || 
                  redirectPath.startsWith('https://')) {
                window.location.href = redirectPath;
              } else {
                // For internal routes
                navigate(redirectPath);
              }
            }, 500);
            
            return;
          }
        }
        
        // Default fallback if no token handling was triggered
        navigate("/gallery");
      } catch (err: any) {
        console.error("Auth callback error:", err);
        setError(err.message || "Authentication failed");
        
        // Redirect to login page after error
        setTimeout(() => {
          navigate("/auth");
        }, 3000);
      }
    };

    processAuthCallback();
  }, [navigate, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      {error ? (
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-red-600">Authentication Error</h2>
          <p className="text-gray-600">{error}</p>
          <p className="text-gray-500">Redirecting to login page...</p>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <h2 className="text-xl font-medium">Completing authentication...</h2>
          <p className="text-gray-500">You'll be redirected shortly</p>
        </div>
      )}
    </div>
  );
};

export default AuthCallback;
