
// Import supabase from the integrations directory
import { supabase } from '@/integrations/supabase/client';

/**
 * Handles OAuth redirect tokens automatically
 * Returns true if a token was successfully processed
 */
export const handleOAuthRedirect = async (): Promise<boolean> => {
  try {
    // Check for hash parameters which may contain tokens
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);
    
    // Extract tokens if present
    const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
    
    // If we have an access token in the URL
    if (accessToken) {
      console.log('[Auth] Found access token in URL');
      
      // Set the session with Supabase
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || ''
      });
      
      if (error) {
        console.error('[Auth] Error setting session:', error);
        return false;
      }
      
      if (data?.session) {
        console.log('[Auth] Successfully set session');
        
        // Clean up the URL by removing the hash
        if (window.history && window.history.replaceState) {
          window.history.replaceState(
            {}, 
            document.title, 
            window.location.pathname
          );
        }
        
        // Store user info in localStorage for use by the extension
        if (data.session.user) {
          localStorage.setItem('main_gallery_user_email', data.session.user.email || 'User');
          localStorage.setItem('main_gallery_user_id', data.session.user.id);
        }
        
        return true;
      }
    }
    
    // Check if we already have a session
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  } catch (err) {
    console.error('[Auth] Error handling OAuth redirect:', err);
    return false;
  }
};

/**
 * Simple function to extract tokens from URL hash
 * This is faster than the full handleOAuthRedirect and doesn't require async/await
 */
export const handleOAuthTokenFromHash = (url: string): boolean => {
  try {
    // Parse hash parameters from the URL
    const hashPart = url.split('#')[1];
    if (!hashPart) return false;
    
    const params = new URLSearchParams(hashPart);
    const accessToken = params.get('access_token');
    
    if (accessToken) {
      console.log('[Auth] Found access token in hash, storing for later use');
      localStorage.setItem('main_gallery_auth_token', accessToken);
      
      // Clean up the URL
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      return true;
    }
    
    return false;
  } catch (err) {
    console.error('[Auth] Error extracting token from hash:', err);
    return false;
  }
};

/**
 * Returns the URL for the gallery based on environment
 */
export const getGalleryUrl = (): string => {
  if (typeof window !== 'undefined') {
    const isPreview = window.location.hostname.includes('preview');
    return isPreview 
      ? 'https://preview-main-gallery-ai.lovable.app/gallery'
      : 'https://main-gallery-ai.lovable.app/gallery';
  }
  // Default to production URL
  return 'https://main-gallery-ai.lovable.app/gallery';
};

// Log that the module is loaded
console.log('[Auth] authTokenHandler.ts loaded');
