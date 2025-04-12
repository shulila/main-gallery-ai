
/**
 * Auth token handler utilities
 * Handles OAuth redirects, token extraction, and related functionality
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Handle OAuth redirect from auth providers
 * This processes the callback URL and signs in the user
 */
export const handleOAuthRedirect = async (): Promise<boolean> => {
  try {
    // Try to extract hash parameters if they exist
    const hashSuccess = handleOAuthTokenFromHash(window.location.href);
    if (hashSuccess) {
      return true;
    }

    // Fall back to Supabase's built-in flow handling
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error handling OAuth redirect:', error);
      return false;
    }
    
    if (data.session) {
      console.log('Successfully authenticated via Supabase OAuth flow');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error in handleOAuthRedirect:', error);
    return false;
  }
};

/**
 * Extract OAuth token from URL hash
 * This is a faster method than relying on the Supabase flow
 */
export const handleOAuthTokenFromHash = (url: string): boolean => {
  try {
    // Parse the URL
    const urlObj = new URL(url);
    
    // Check for access token in hash or query params
    const hash = urlObj.hash.substring(1); // Remove the # character
    const searchParams = new URLSearchParams(hash || urlObj.search);
    
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const expiresIn = searchParams.get('expires_in');
    
    if (!accessToken) {
      return false;
    }
    
    // Store the token in localStorage for future use
    const now = Date.now();
    const expiresAt = expiresIn ? now + parseInt(expiresIn) * 1000 : now + 3600000; // Default to 1 hour
    
    localStorage.setItem('auth_access_token', accessToken);
    
    if (refreshToken) {
      localStorage.setItem('auth_refresh_token', refreshToken);
    }
    
    localStorage.setItem('auth_expires_at', expiresAt.toString());
    
    console.log('Successfully extracted auth token from URL hash');
    return true;
  } catch (error) {
    console.error('Error extracting OAuth token from hash:', error);
    return false;
  }
};

/**
 * Get the gallery URL to redirect to after authentication
 */
export const getGalleryUrl = (): string => {
  // Default gallery URL
  const defaultUrl = '/gallery';
  
  try {
    // Check if there's a redirect URL in localStorage
    const redirectUrl = localStorage.getItem('auth_redirect_url');
    
    if (redirectUrl) {
      // Remove the redirect URL from localStorage
      localStorage.removeItem('auth_redirect_url');
      
      // Validate the URL to prevent open redirect vulnerabilities
      const url = new URL(redirectUrl, window.location.origin);
      
      // Only allow redirects to the same origin
      if (url.origin === window.location.origin) {
        return url.pathname + url.search + url.hash;
      }
    }
  } catch (error) {
    console.error('Error getting gallery URL:', error);
  }
  
  return defaultUrl;
};

/**
 * Store the current URL to redirect back after authentication
 */
export const storeCurrentUrlForRedirect = (): void => {
  try {
    localStorage.setItem('auth_redirect_url', window.location.href);
  } catch (error) {
    console.error('Error storing current URL for redirect:', error);
  }
};

/**
 * Get authentication token from storage
 */
export const getStoredAuthToken = (): string | null => {
  try {
    return localStorage.getItem('auth_access_token');
  } catch (error) {
    console.error('Error getting stored auth token:', error);
    return null;
  }
};
