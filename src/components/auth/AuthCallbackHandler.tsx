
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
        let success = false;
        
        // First try extracting directly from hash
        if (window.location.hash && window.location.hash.includes('access_token')) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token') || '';
          const email = hashParams.get('email') || '';
          
          if (accessToken) {
            recordDebugInfo('token_found_in_hash', { hasToken: true });
            console.log('[MainGallery] Found access token in URL hash, setting up session');
            
            try {
              // Explicitly set the Supabase session with the token
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              });
              
              if (error) {
                console.error('[MainGallery] Error setting Supabase session:', error);
                recordDebugInfo('supabase_session_error', { error: error.message });
                throw error;
              }
              
              // Store token in localStorage for backup and extension access
              localStorage.setItem('access_token', accessToken);
              if (refreshToken) {
                localStorage.setItem('refresh_token', refreshToken);
              }
              
              // Calculate token expiration (24 hours from now)
              const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
              
              // Store token info for extension usage
              const tokenData = {
                access_token: accessToken,
                refresh_token: refreshToken,
                timestamp: Date.now(),
                expires_at: expiresAt
              };
              
              localStorage.setItem('main_gallery_auth_token', JSON.stringify(tokenData));
              
              // Store user info for extension access
              if (data?.user) {
                localStorage.setItem('main_gallery_user_email', data.user.email || 'User');
                localStorage.setItem('main_gallery_user_id', data.user.id);
                recordDebugInfo('user_data_stored', { 
                  email: data.user.email, 
                  id: data.user.id 
                });
              }
              
              // Double check session is valid by getting current user
              const { data: userData } = await supabase.auth.getUser();
              recordDebugInfo('session_verification', { 
                sessionValid: !!userData?.user,
                userEmail: userData?.user?.email
              });
              
              success = true;
              
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
            } catch (sessionError) {
              console.error('[MainGallery] Error in direct session setup:', sessionError);
              recordDebugInfo('direct_session_setup_error', { error: sessionError.message });
            }
          }
        }
        
        // If direct extraction failed, try our utility function
        if (!success) {
          success = await handleOAuthTokenFromHash(window.location.href);
          recordDebugInfo('token_from_hash_result', { success });
        }
        
        // If that still failed, try the full redirect handler 
        if (!success) {
          success = await handleOAuthRedirect();
          recordDebugInfo('oauth_redirect_result', { success });
        }
        
        // Check the session after all attempts
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionExists = !!sessionData.session;
        recordDebugInfo('final_session_check', { 
          sessionExists,
          user: sessionData.session?.user?.email 
        });
        
        if (success || sessionExists) {
          // Set success status and toast notification
          setStatus('Login successful! Redirecting...');
          toast({
            title: "Login Successful",
            description: "You've been logged in successfully!",
          });
          
          // CRITICAL FIX: Clear any problematic URL fragments/params
          // This prevents login loops where the token stays in the URL
          if (window.location.hash || window.location.search.includes('access_token')) {
            // Use history API to clear hash without triggering reload
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            recordDebugInfo('url_cleaned', { from: window.location.href, to: cleanUrl });
          }
          
          // Redirect to gallery
          console.log('[MainGallery] Redirecting to gallery');
          setTimeout(() => {
            navigate('/gallery');
          }, 800);
        } else {
          // No success or session - show error
          console.error('[MainGallery] Failed to establish session');
          setStatus('Authentication error');
          setError('Failed to establish a session. Please try logging in again.');
          
          toast({
            title: "Authentication Error",
            description: "Failed to establish a session. Please try logging in again.",
            variant: "destructive",
          });
          
          // Redirect to login page after a delay
          setTimeout(() => navigate('/auth'), 2000);
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
