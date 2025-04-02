import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { handleOAuthRedirect, handleOAuthTokenFromHash, getGalleryUrl } from '@/utils/authTokenHandler';

type AuthCallbackHandlerProps = {
  setStatus: (status: string) => void;
  setError: (error: string | null) => void;
};

/**
 * Component that handles the OAuth callback logic
 */
export const AuthCallbackHandler = ({ setStatus, setError }: AuthCallbackHandlerProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    console.log('AuthCallbackHandler initialized');
    console.log('Current URL:', window.location.href);
    
    // Critical fix: Check for incorrect domain first and redirect if needed
    const currentURL = window.location.href;
    if (
      currentURL.includes("preview-main-gallery-ai.lovable.app") &&
      (currentURL.includes("#access_token=") || currentURL.includes("?access_token="))
    ) {
      console.warn("Detected auth callback on incorrect domain, redirecting to production domain");
      const correctedURL = currentURL.replace(
        "preview-main-gallery-ai.lovable.app",
        "main-gallery-hub.lovable.app"
      );
      console.log("Redirecting to:", correctedURL);
      window.location.href = correctedURL;
      return;
    }

    // Function to complete authentication
    const completeAuth = async () => {
      try {
        console.log('Starting OAuth callback processing with URL:', window.location.href);
        setStatus('Processing login...');
        
        // Try direct hash token extraction first (fastest method)
        const hashHandled = handleOAuthTokenFromHash();
        
        if (hashHandled) {
          console.log('Successfully handled OAuth token from hash');
          setStatus('Login successful! Redirecting...');
          
          toast({
            title: "Login Successful",
            description: "You've been logged in successfully!",
          });
          
          // Slight delay before redirect to gallery
          setTimeout(() => {
            navigate('/gallery');
          }, 1000);
          return;
        }
        
        // If hash method failed, try our token handler utility
        const tokenHandled = await handleOAuthRedirect();
        
        if (tokenHandled) {
          console.log('Successfully handled OAuth redirect with token utility');
          setStatus('Login successful! Redirecting...');
          
          // Check if there's pending sync data in the session storage
          const pendingSync = sessionStorage.getItem('maingallery_pending_sync');
          let syncData = null;
          
          if (pendingSync) {
            try {
              syncData = JSON.parse(pendingSync);
              console.log('Found pending image sync data:', syncData);
            } catch (e) {
              console.error('Error parsing pending sync data:', e);
            }
            // Clear the pending sync data
            sessionStorage.removeItem('maingallery_pending_sync');
          }
          
          toast({
            title: "Login Successful",
            description: "You've been logged in successfully!",
          });
          
          // Slight delay before redirect to ensure processing
          setTimeout(() => {
            console.log('Redirecting to destination');
            
            // Check for extension login
            const fromExtension = new URLSearchParams(window.location.search).get('from') === 'extension';
            
            // If there's pending sync data, redirect to gallery
            if (syncData && syncData.images && syncData.images.length > 0) {
              // Store the sync data in session storage for the gallery to pick up
              sessionStorage.setItem('maingallery_sync_images', JSON.stringify(syncData.images));
              navigate('/gallery');
            } else if (fromExtension) {
              // If from extension, we'll let the extension handle the redirect
              console.log('Login from extension completed, waiting for extension to handle redirect');
              
              // Extension listener will close this tab and open gallery
              // But still redirect after a timeout as fallback
              setTimeout(() => {
                window.location.href = getGalleryUrl();
              }, 2000);
            } else {
              // Otherwise redirect to gallery as default destination
              navigate('/gallery');
            }
          }, 1000);
          return;
        }
        
        // Call the fallback token extraction if both methods above failed
        const extractedToken = await extractTokenFallback();
        if (extractedToken) {
          return;
        }
        
        // If we reach here, no token was found - show error
        console.error('No access token found in URL');
        setStatus('Login failed. No access token found.');
        setError('We couldn\'t find an authentication token in the URL. Please try logging in again.');
        
        toast({
          title: "Login Failed",
          description: "No authentication token found. Please try again.",
          variant: "destructive",
        });
        
        // Redirect to login page after a delay
        setTimeout(() => navigate('/auth'), 3000);
      } catch (err) {
        console.error('Error during auth callback processing:', err);
        setStatus('Authentication error');
        setError('An error occurred during login. Please try again.');
        
        toast({
          title: "Authentication Error",
          description: "An error occurred during login. Please try again.",
          variant: "destructive",
        });
        
        // Redirect to login page after a delay
        setTimeout(() => navigate('/auth'), 3000);
      }
    };

    // Complete fallback method - extract token manually if both methods above failed
    // This ensures any possible OAuth token format is handled
    const extractTokenFallback = async () => {
      // Try to extract token from hash
      const hashParams = new URLSearchParams(window.location.hash ? window.location.hash.substring(1) : '');
      const queryParams = new URLSearchParams(window.location.search);
      
      // Try to get token from both locations
      const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
      const userEmail = hashParams.get('email') || queryParams.get('email');
      
      console.log('Final token extraction attempt:', { 
        hasToken: !!accessToken, 
        hasRefreshToken: !!refreshToken,
        hasEmail: !!userEmail,
        url: window.location.href
      });
      
      if (accessToken) {
        console.log('Token found in final extraction attempt, storing in session');
        
        // Calculate expiration time (24 hours from now)
        const expiresAt = Date.now() + (24 * 60 * 60 * 1000);
          
        // Store tokens in localStorage for the web app
        const tokenData = {
          access_token: accessToken,
          refresh_token: refreshToken || '',
          timestamp: Date.now(),
          expires_at: expiresAt
        };
        
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('main_gallery_auth_token', JSON.stringify(tokenData));
        
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken);
        }
        
        if (userEmail) {
          localStorage.setItem('main_gallery_user_email', userEmail);
        }
        
        // Try to create a session with Supabase using the token
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });
          
          if (error) {
            console.error('Error setting Supabase session:', error);
            throw error;
          }
          
          console.log('Successfully set Supabase session in fallback method');
        } catch (error) {
          console.error('Failed to set Supabase session in fallback method:', error);
          // Continue anyway as we have the token stored in localStorage
        }
        
        setStatus('Login successful! Redirecting...');
        
        toast({
          title: "Login Successful",
          description: "You've been logged in successfully!",
        });
        
        // Redirect to gallery after successful auth
        setTimeout(() => {
          navigate('/gallery');
        }, 1000);
        
        return true;
      }
      
      return false;
    };

    // Execute the auth completion function
    completeAuth();
  }, [navigate, toast, setStatus, setError]);

  return null;
};
