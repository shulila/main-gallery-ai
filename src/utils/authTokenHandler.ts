
import { supabase } from '@/integrations/supabase/client';

/**
 * Handles OAuth redirect by extracting token from URL hash and setting up session
 * @returns A promise that resolves when token handling is complete
 */
export const handleOAuthRedirect = async (): Promise<boolean> => {
  try {
    // Check if we have an access token in the URL hash or search params
    const hash = window.location.hash;
    const search = window.location.search;
    
    // Extract from hash first (most common with OAuth providers)
    if (hash && hash.includes('access_token')) {
      console.log('Found token in hash fragment');
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token') || '';
      const email = params.get('email');
      
      if (accessToken) {
        console.log('Setting session with token from hash');
        
        // Update Supabase session
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        
        if (error) {
          console.error('Error setting Supabase session:', error);
          return false;
        }
        
        // Calculate token expiration (24 hours from now)
        const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
          
        // Store token info and user email for extension usage
        const tokenData = {
          access_token: accessToken,
          refresh_token: refreshToken,
          timestamp: Date.now(),
          expires_at: expiresAt
        };
        
        // Also store in localStorage for web app use
        localStorage.setItem('main_gallery_auth_token', JSON.stringify(tokenData));
        if (email) {
          localStorage.setItem('main_gallery_user_email', email);
        }
        
        // If in Chrome extension context, also store in chrome.storage
        if (typeof window !== 'undefined' && 'chrome' in window && window.chrome?.storage) {
          try {
            window.chrome.storage.sync.set({
              'main_gallery_auth_token': tokenData,
              'main_gallery_user_email': email || (data?.user?.email || 'User')
            }, () => {
              console.log('Auth data synced to chrome.storage');
            });
          } catch (err) {
            console.error('Error syncing to chrome.storage:', err);
          }
        }
        
        console.log('Successfully set up session from OAuth redirect');
        return true;
      }
    }
    
    // Check search params as fallback
    if (search && search.includes('access_token')) {
      const params = new URLSearchParams(search);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token') || '';
      
      if (accessToken) {
        console.log('Setting session with token from search params');
        
        // Update Supabase session
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        
        if (error) {
          console.error('Error setting Supabase session from query params:', error);
          return false;
        }
        
        console.log('Successfully set up session from URL query params');
        return true;
      }
    }
    
    return false;
  } catch (err) {
    console.error('Error handling OAuth redirect:', err);
    return false;
  }
};

/**
 * Handle OAuth token directly from the URL hash
 * @param {string} [callbackUrl] Optional URL to extract token from (defaults to window.location.href)
 * @returns {boolean} Whether token was successfully extracted and processed
 */
export const handleOAuthTokenFromHash = (callbackUrl?: string): boolean => {
  try {
    const url = callbackUrl || window.location.href;
    // Try to get hash fragment
    const hashPart = url.split('#')[1];
    
    if (!hashPart) {
      return false;
    }
    
    const params = new URLSearchParams(hashPart);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token') || '';
    const email = params.get('email') || 'User';
    
    if (!accessToken) {
      console.log('No access token found in URL hash');
      return false;
    }
    
    console.log('Found access token in URL hash');
    
    // Calculate expiration (24 hours)
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000);
    
    // Store token data
    const tokenData = {
      access_token: accessToken,
      refresh_token: refreshToken,
      timestamp: Date.now(),
      expires_at: expiresAt
    };
    
    // Store in localStorage
    localStorage.setItem('main_gallery_auth_token', JSON.stringify(tokenData));
    localStorage.setItem('main_gallery_user_email', email);
    
    // If in Chrome extension context, also store in chrome.storage
    if (typeof window !== 'undefined' && 'chrome' in window && window.chrome?.storage) {
      try {
        window.chrome.storage.sync.set({
          'main_gallery_auth_token': tokenData,
          'main_gallery_user_email': email
        }, () => {
          console.log('Auth data synced to chrome.storage from hash handler');
        });
      } catch (err) {
        console.error('Error syncing to chrome.storage from hash handler:', err);
      }
    }
    
    return true;
  } catch (err) {
    console.error('Error handling OAuth token from hash:', err);
    return false;
  }
};
