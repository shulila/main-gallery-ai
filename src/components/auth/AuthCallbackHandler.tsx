
import { useEffect, useState } from 'react';
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
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    console.log('[MainGallery] AuthCallbackHandler initialized');
    console.log('[MainGallery] Current URL:', window.location.href);
    
    // Record debug info for easier troubleshooting
    const recordDebugInfo = (status: string, details: any = {}) => {
      console.log(`[MainGallery] Auth debug - ${status}:`, details);
      setDebugInfo(prev => ({ ...prev, status, ...details, timestamp: new Date().toISOString() }));
    };
    
    // Critical fix: Check for incorrect domain first and redirect if needed
    const currentURL = window.location.href;
    if (
      currentURL.includes("preview-main-gallery-ai.lovable.app") &&
      (currentURL.includes("#access_token=") || currentURL.includes("?access_token="))
    ) {
      recordDebugInfo('domain_redirect', { from: 'preview', to: 'production' });
      const correctedURL = currentURL.replace(
        "preview-main-gallery-ai.lovable.app",
        "main-gallery-ai.lovable.app"
      );
      console.log("[MainGallery] Redirecting to:", correctedURL);
      window.location.href = correctedURL;
      return;
    }

    // Function to complete authentication
    const completeAuth = async () => {
      try {
        recordDebugInfo('auth_process_started', { url: window.location.href });
        console.log('[MainGallery] Starting OAuth callback processing with URL:', window.location.href);
        setStatus('Processing login...');
        
        // Try direct hash token extraction first (fastest method)
        const hashParams = new URLSearchParams(window.location.hash ? window.location.hash.substring(1) : '');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || '';
        
        if (accessToken) {
          recordDebugInfo('token_found_in_hash', { hasToken: true });
          console.log('[MainGallery] Found access token in URL hash, setting up session');
          
          // Explicitly set the Supabase session with the token
          try {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            
            if (error) {
              console.error('[MainGallery] Error setting Supabase session:', error);
              recordDebugInfo('supabase_session_error', { error: error.message });
              throw error;
            }
            
            // Store token in localStorage as backup
            localStorage.setItem('access_token', accessToken);
            if (refreshToken) {
              localStorage.setItem('refresh_token', refreshToken);
            }
            
            // Store user info for extension access
            if (data?.user) {
              localStorage.setItem('main_gallery_user_email', data.user.email || 'User');
              localStorage.setItem('main_gallery_user_id', data.user.id);
              recordDebugInfo('user_data_stored', { 
                email: data.user.email, 
                id: data.user.id.substring(0, 8) + '...' 
              });
            }
            
            // Double check session is valid by getting current user
            const { data: userData } = await supabase.auth.getUser();
            recordDebugInfo('session_verification', { 
              sessionValid: !!userData?.user,
              userEmail: userData?.user?.email
            });
            
            // Notify any extension listeners about successful login
            try {
              console.log('[MainGallery] Notifying about successful login');
              window.postMessage({
                type: "WEB_APP_TO_EXTENSION",
                action: "loginSuccess",
                email: data?.user?.email || 'User',
                timestamp: Date.now()
              }, "*");
              recordDebugInfo('extension_notified');
            } catch (e) {
              console.error('[MainGallery] Error sending message to extension:', e);
            }
            
            // Set success status and toast notification
            setStatus('Login successful! Redirecting...');
            toast({
              title: "Login Successful",
              description: "You've been logged in successfully!",
            });
            
            // Redirect to gallery
            console.log('[MainGallery] Redirecting to gallery');
            setTimeout(() => {
              navigate('/gallery');
            }, 1000);
            
            return true;
          } catch (sessionError) {
            console.error('[MainGallery] Error in session setup:', sessionError);
            recordDebugInfo('session_setup_error', { error: sessionError.message });
            
            // Try alternative fallback method
            return await handleOAuthRedirect();
          }
        } else {
          recordDebugInfo('no_token_in_hash');
          console.log('[MainGallery] No token found in hash, trying alternative methods');
          
          // Try our token handler utility as fallback
          const tokenHandled = await handleOAuthRedirect();
          
          if (tokenHandled) {
            recordDebugInfo('token_handled_by_redirect');
            console.log('[MainGallery] Successfully handled OAuth redirect with token utility');
            setStatus('Login successful! Redirecting...');
            
            toast({
              title: "Login Successful",
              description: "You've been logged in successfully!",
            });
            
            // Double check session is valid
            const { data: userData } = await supabase.auth.getUser();
            recordDebugInfo('session_check_after_redirect', { 
              valid: !!userData?.user,
              email: userData?.user?.email 
            });
            
            // Redirect to gallery after successful auth
            setTimeout(() => {
              console.log('[MainGallery] Redirecting to gallery after successful auth');
              navigate('/gallery');
            }, 1000);
            
            return true;
          }
          
          // If we get here, no token was found - show error
          recordDebugInfo('no_token_found');
          console.error('[MainGallery] No access token found in URL');
          setStatus('Login failed. No access token found.');
          setError('We couldn\'t find an authentication token in the URL. Please try logging in again.');
          
          toast({
            title: "Login Failed",
            description: "No authentication token found. Please try again.",
            variant: "destructive",
          });
          
          // Redirect to login page after a delay
          setTimeout(() => navigate('/auth'), 3000);
          return false;
        }
      } catch (err) {
        recordDebugInfo('auth_process_error', { error: err.message });
        console.error('[MainGallery] Error during auth callback processing:', err);
        setStatus('Authentication error');
        setError('An error occurred during login. Please try again.');
        
        toast({
          title: "Authentication Error",
          description: "An error occurred during login. Please try again.",
          variant: "destructive",
        });
        
        // Redirect to login page after a delay
        setTimeout(() => navigate('/auth'), 3000);
        return false;
      }
    };

    // Execute the auth completion function
    completeAuth();
  }, [navigate, toast, setStatus, setError]);

  return (
    <div>
      {/* Hidden debug info that can be toggled */}
      <div id="auth-debug-info" style={{ display: 'none' }}>
        <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
      </div>
    </div>
  );
};

export default AuthCallbackHandler;
