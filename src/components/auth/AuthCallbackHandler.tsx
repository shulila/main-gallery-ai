
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getGalleryUrl } from '@/utils/authTokenHandler';

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
    
    const recordDebugInfo = (status: string, details: any = {}) => {
      console.log(`[MainGallery] Auth debug - ${status}:`, details);
      setDebugInfo(prev => ({ ...prev, status, ...details, timestamp: new Date().toISOString() }));
    };
    
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

    const isFromExtension = currentURL.includes('chrome-extension://') || 
                           window.location.search.includes('from=extension');
    
    const completeAuth = async () => {
      try {
        recordDebugInfo('auth_process_started', { url: window.location.href, isFromExtension });
        console.log('[MainGallery] Starting OAuth callback processing with URL:', window.location.href);
        setStatus('Processing login...');
        
        let success = false;
        
        // Use Supabase v2's getSessionFromUrl method to handle the OAuth callback
        const { data, error } = await supabase.auth.getSessionFromUrl();
        
        if (error) {
          console.error('[MainGallery] Error getting session from URL:', error);
          recordDebugInfo('session_from_url_error', { error: error.message });
          throw error;
        }
        
        if (data.session) {
          recordDebugInfo('session_from_url_success', { 
            user: data.session.user.email,
            expiresAt: data.session.expires_at
          });
          
          // Store relevant information for the application
          localStorage.setItem('main_gallery_user_email', data.session.user.email || 'User');
          localStorage.setItem('main_gallery_user_id', data.session.user.id);
          
          // Get detailed user information
          const { data: userData } = await supabase.auth.getUser();
          
          recordDebugInfo('session_verification', { 
            sessionValid: !!userData?.user,
            userEmail: userData?.user?.email 
          });
          
          success = true;
          
          // Clean URL after successful authentication
          if (window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
            recordDebugInfo('url_cleaned', { action: 'hash_removed' });
          }
          
          try {
            console.log('[MainGallery] Notifying about successful login');
            window.postMessage({
              type: "WEB_APP_TO_EXTENSION",
              action: "loginSuccess",
              email: data.session.user.email || 'User',
              timestamp: Date.now()
            }, "*");
            recordDebugInfo('extension_notified');
            
            if (isFromExtension) {
              console.log('[MainGallery] Detected auth from extension, sending message to extension');
              if (window.opener) {
                window.opener.postMessage({
                  type: "WEB_APP_TO_EXTENSION",
                  action: "loginSuccess",
                  email: data.session.user.email || 'User',
                  timestamp: Date.now()
                }, "*");
                
                setTimeout(() => {
                  window.close();
                }, 1000);
                return;
              }
              
              if (typeof window !== 'undefined' && window.chrome && window.chrome.runtime) {
                window.chrome.runtime.sendMessage({
                  type: "WEB_APP_TO_EXTENSION",
                  action: "loginSuccess",
                  email: data.session.user.email || 'User',
                  token: data.session.access_token,
                  timestamp: Date.now()
                });
              }
            }
          } catch (e) {
            console.error('[MainGallery] Error sending message to extension:', e);
          }
        }
        
        // Check the current session state if we don't have success yet
        if (!success) {
          const { data: sessionData } = await supabase.auth.getSession();
          const sessionExists = !!sessionData.session;
          recordDebugInfo('final_session_check', { 
            sessionExists,
            user: sessionData.session?.user?.email 
          });
          
          if (sessionExists) {
            success = true;
          }
        }
        
        if (isFromExtension && success) {
          setStatus('Login successful! You can close this tab now.');
          toast({
            title: "Login Successful",
            description: "You can now close this window and return to the extension.",
          });
          
          // Get the latest session data
          const { data: latestSession } = await supabase.auth.getSession();
          
          if (latestSession.session?.user) {
            window.postMessage({
              type: "WEB_APP_TO_EXTENSION",
              action: "loginSuccess",
              email: latestSession.session.user.email || 'User',
              timestamp: Date.now()
            }, "*");
          }
          
          if (window.opener) {
            setTimeout(() => {
              window.close();
            }, 2000);
            return;
          }
          
          return;
        }
        
        if (success) {
          setStatus('Login successful! Redirecting...');
          toast({
            title: "Login Successful",
            description: "You've been logged in successfully!",
          });
          
          // Clean URL if needed
          if ((window.location.hash || window.location.search.includes('access_token')) && 
              window.history && window.history.replaceState) {
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            recordDebugInfo('url_cleaned', { from: window.location.href, to: cleanUrl });
          }
          
          setTimeout(() => {
            navigate('/gallery');
          }, 800);
        } else {
          console.error('[MainGallery] Failed to establish session');
          setStatus('Authentication error');
          setError('Failed to establish a session. Please try logging in again.');
          
          toast({
            title: "Authentication Error",
            description: "Failed to establish a session. Please try logging in again.",
            variant: "destructive",
          });
          
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
        
        setTimeout(() => navigate('/auth'), 3000);
      }
    };

    completeAuth();
  }, [navigate, toast, setStatus, setError]);

  return (
    <div>
      <div id="auth-debug-info" style={{ display: 'none' }}>
        <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
      </div>
    </div>
  );
};

export default AuthCallbackHandler;
