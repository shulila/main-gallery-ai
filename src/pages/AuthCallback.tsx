
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
            
            // Prepare token data
            const tokenData = {
              access_token: accessToken,
              refresh_token: refreshToken,
              timestamp: Date.now()
            };
            
            // Store the token in localStorage for web app use
            localStorage.setItem('main_gallery_auth_token', JSON.stringify(tokenData));
            
            // Also store user email if available
            if (email) {
              localStorage.setItem('main_gallery_user_email', email);
            }
            
            // Sync to chrome.storage if in extension context
            if (typeof window !== 'undefined' && 'chrome' in window && window.chrome?.storage) {
              try {
                window.chrome.storage.sync.set({
                  'main_gallery_auth_token': tokenData,
                  'main_gallery_user_email': email || 'User'
                }, () => {
                  console.log('Auth data synced to chrome.storage');
                });
              } catch (err) {
                console.error('Error syncing to chrome.storage:', err);
              }
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
        
        // Exchange code for session if available in the URL
        const code = queryParams.code;
        if (code) {
          console.log('Got authorization code, exchanging for session');
          
          // The supabase client will automatically handle the code exchange
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            throw new Error(`Error exchanging code: ${exchangeError.message}`);
          }
          
          if (data.session) {
            console.log('Successfully exchanged code for session');
            
            // Sync to localStorage for web app use
            const tokenData = {
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token || '',
              timestamp: Date.now()
            };
            
            localStorage.setItem('main_gallery_auth_token', JSON.stringify(tokenData));
            localStorage.setItem('main_gallery_user_email', data.session.user.email || 'User');
            
            // Sync to chrome.storage if in extension context
            if (typeof window !== 'undefined' && 'chrome' in window && window.chrome?.storage) {
              try {
                window.chrome.storage.sync.set({
                  'main_gallery_auth_token': tokenData,
                  'main_gallery_user_email': data.session.user.email || 'User'
                }, () => {
                  console.log('Auth data synced to chrome.storage');
                });
              } catch (err) {
                console.error('Error syncing to chrome.storage:', err);
              }
            }
            
            // Redirect to gallery
            navigate('/gallery');
            return;
          }
        }
        
        // Default fallback if no token handling was triggered
        // First try to get any existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate("/gallery");
        } else {
          navigate("/auth");
        }
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
