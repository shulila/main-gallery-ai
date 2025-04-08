
import { supabase } from '@/integrations/supabase/client';

/**
 * Get the production URL for auth redirects
 * @returns Base URL for authentication
 */
export const getAuthBaseUrl = (): string => {
  // Check if in preview environment
  if (typeof window !== 'undefined' && 
      window.location && 
      window.location.hostname) {
    
    // Check for preview domain
    if (window.location.hostname.includes('preview-main-gallery-ai') ||
        window.location.hostname.includes('preview--main-gallery-ai')) {
      return 'https://preview-main-gallery-ai.lovable.app';
    }
  }
  
  // Default to production domain
  return 'https://main-gallery-ai.lovable.app';
};

/**
 * Get the gallery URL
 * @returns URL for the gallery page
 */
export const getGalleryUrl = (): string => {
  return `${getAuthBaseUrl()}/gallery`;
};

/**
 * Handles OAuth redirect by extracting token from URL hash and setting up session
 * @returns A promise that resolves when token handling is complete
 */
export const handleOAuthRedirect = async (): Promise<boolean> => {
  try {
    // Check if we have an access token in the URL hash or search params
    const hash = window.location.hash;
    const search = window.location.search;
    
    // Check if this is an auth callback
    const isCallback = window.location.pathname === '/auth/callback' || 
                      window.location.pathname.includes('/callback') ||
                      hash.includes('access_token') || 
                      search.includes('access_token');
    
    if (!isCallback) {
      console.log('Not an auth callback, skipping token handling');
      return false;
    }
    
    console.log('Auth callback detected, attempting to handle token');

    // Extract current location information for proper redirect handling
    const currentHostname = window.location.hostname;
    
    // Log hostname for debugging
    console.log('Current hostname:', currentHostname);
    
    // Check for development domain and adapt behavior
    const isDev = currentHostname === 'localhost' || 
                 currentHostname.includes('127.0.0.1') ||
                 currentHostname.includes('lovableproject.com');
    
    if (isDev) {
      console.log('Detected development environment:', currentHostname);
    }
    
    // Determine if we're in the preview environment
    const isPreview = currentHostname.includes('preview-main-gallery-ai') ||
                     currentHostname.includes('preview--main-gallery-ai');
                     
    console.log('Environment detection - isPreview:', isPreview);
    
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
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('main_gallery_auth_token', JSON.stringify(tokenData));
        if (email) {
          localStorage.setItem('main_gallery_user_email', email);
        }
        
        // If in Chrome extension context, also store in chrome.storage
        if (typeof window !== 'undefined' && window.chrome && window.chrome.storage) {
          try {
            window.chrome.storage?.sync.set({
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
        
        // Redirect to gallery after successful auth if not in development
        if (!isDev) {
          setTimeout(() => {
            window.location.href = getGalleryUrl();
          }, 500);
        }
        
        return true;
      }
    }
    
    // Check search params as fallback
    if (search && search.includes('access_token')) {
      const params = new URLSearchParams(search);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token') || '';
      const email = params.get('email');
      
      if (accessToken) {
        console.log('Setting session with token from search params');
        
        // Update Supabase session
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        
        if (error) {
          console.error('Error setting Supabase session from query params:', error);
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
        
        // Store in localStorage
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('main_gallery_auth_token', JSON.stringify(tokenData));
        if (email) {
          localStorage.setItem('main_gallery_user_email', email);
        }
        
        console.log('Successfully set up session from URL query params');
        
        // Redirect to gallery after successful auth if not in development
        if (!isDev) {
          setTimeout(() => {
            window.location.href = getGalleryUrl();
          }, 500);
        }
        
        return true;
      }
    }
    
    console.log('No token found in URL hash or search params');
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
    
    // Check if this is an auth callback
    if (!url.includes('callback') && !url.includes('access_token')) {
      console.log('Not an auth callback URL, skipping token extraction');
      return false;
    }
    
    // Log the URL we're processing (with token partially hidden for security)
    const logUrl = url.replace(/access_token=([^&]+)/, 'access_token=****');
    console.log('Processing auth callback URL:', logUrl);
    
    // Check for incorrect domain and redirect if needed
    if (url.includes('preview-main-gallery-ai.lovable.app')) {
      console.warn('Detected token on preview domain - redirecting to production domain');
      const correctedURL = url.replace(
        'preview-main-gallery-ai.lovable.app',
        'main-gallery-hub.lovable.app'
      );
      window.location.href = correctedURL;
      return true;
    }
    
    // Check for development domain and adapt behavior
    const isDev = url.includes('localhost') || 
                 url.includes('127.0.0.1') ||
                 url.includes('lovableproject.com');
    
    if (isDev) {
      console.log('Detected development environment');
    }
    
    // Try to get hash fragment
    let hashPart = '';
    if (url.includes('#')) {
      hashPart = url.split('#')[1];
    }
    
    // No hash found, check if token is in query string
    if (!hashPart || !hashPart.includes('access_token')) {
      if (url.includes('?access_token=')) {
        // Token is in query params
        const queryString = url.split('?')[1];
        const params = new URLSearchParams(queryString);
        const accessToken = params.get('access_token');
        
        if (accessToken) {
          console.log('Found access token in URL query parameters');
          processAccessToken(accessToken, params.get('refresh_token') || '', params.get('email') || 'User', isDev);
          return true;
        }
      }
      
      console.log('No access token found in URL hash or query');
      return false;
    }
    
    // Process the hash fragment
    const params = new URLSearchParams(hashPart);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token') || '';
    const email = params.get('email') || 'User';
    
    if (!accessToken) {
      console.log('No access token found in URL hash');
      return false;
    }
    
    console.log('Found access token in URL hash');
    return processAccessToken(accessToken, refreshToken, email, isDev);
    
  } catch (err) {
    console.error('Error handling OAuth token from hash:', err);
    return false;
  }
};

// Helper function to process an access token
function processAccessToken(accessToken: string, refreshToken: string, email: string, isDev: boolean): boolean {
  try {
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
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('main_gallery_auth_token', JSON.stringify(tokenData));
    localStorage.setItem('main_gallery_user_email', email);
    
    // If in Chrome extension context, also store in chrome.storage
    if (typeof window !== 'undefined' && window.chrome && window.chrome.storage) {
      try {
        window.chrome.storage?.sync.set({
          'main_gallery_auth_token': tokenData,
          'main_gallery_user_email': email
        }, () => {
          console.log('Auth data synced to chrome.storage from hash handler');
        });
      } catch (err) {
        console.error('Error syncing to chrome.storage from hash handler:', err);
      }
    }
    
    // Also try to set Supabase session
    try {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      }).then(({ data, error }) => {
        if (error) {
          console.error('Error setting Supabase session in handleOAuthTokenFromHash:', error);
        } else {
          console.log('Successfully set Supabase session in handleOAuthTokenFromHash');
          
          // Redirect to gallery after successful auth if not in development
          if (!isDev) {
            setTimeout(() => {
              window.location.href = getGalleryUrl();
            }, 500);
          }
        }
      });
    } catch (err) {
      console.error('Error calling Supabase setSession in handleOAuthTokenFromHash:', err);
    }
    
    return true;
  } catch (err) {
    console.error('Error processing access token:', err);
    return false;
  }
}

/**
 * Handle OAuth token in the production environment with multiple fallbacks
 * This robust implementation ensures that auth always works across all domains
 */
export const handleProductionOAuthToken = (): boolean => {
  try {
    // Check current URL for override domain
    const currentHostname = window.location.hostname;
    const url = window.location.href;
    
    // Detect if we're on preview or production
    const isProdDomain = currentHostname.includes('main-gallery-ai.lovable.app');
    const isPreviewDomain = currentHostname.includes('preview-main-gallery-ai.lovable.app');
    const isCallback = url.includes('/callback') || url.includes('access_token');
    
    // Log environment info
    console.log('Token handler environment:', {
      isProdDomain,
      isPreviewDomain,
      isCallback,
      hostname: currentHostname,
      pathname: window.location.pathname
    });
    
    // Check for common redirection issues
    if (isCallback) {
      // If on preview domain with token, redirect to production domain
      if (isPreviewDomain && 
         (url.includes('#access_token=') || url.includes('?access_token='))) {
        console.warn('Token found on preview domain, redirecting to production');
        const correctedURL = url.replace(
          'preview-main-gallery-ai.lovable.app',
          'main-gallery-ai.lovable.app'
        );
        window.location.href = correctedURL;
        return true;
      }
      
      // Try to extract token from hash or query params
      const hash = window.location.hash;
      const search = window.location.search;
      
      // Extract from hash first (most common with OAuth providers)
      if (hash && hash.includes('access_token=')) {
        // Process token from hash
        return handleOAuthTokenFromHash();
      }
      
      // Fall back to query params
      if (search && search.includes('access_token=')) {
        // Let the standard handler deal with it
        handleOAuthRedirect();
        return true;
      }
    }
    
    return false;
  } catch (err) {
    console.error('Error in production OAuth handler:', err);
    return false;
  }
};
