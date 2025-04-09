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
      console.log('[MainGallery] Not an auth callback, skipping token handling');
      return false;
    }
    
    console.log('[MainGallery] Auth callback detected, attempting to handle token');

    // Extract current location information for proper redirect handling
    const currentHostname = window.location.hostname;
    
    // Log hostname for debugging
    console.log('[MainGallery] Current hostname:', currentHostname);
    
    // Check for development domain and adapt behavior
    const isDev = currentHostname === 'localhost' || 
                 currentHostname.includes('127.0.0.1') ||
                 currentHostname.includes('lovableproject.com');
    
    if (isDev) {
      console.log('[MainGallery] Detected development environment:', currentHostname);
    }
    
    // Determine if we're in the preview environment
    const isPreview = currentHostname.includes('preview-main-gallery-ai') ||
                     currentHostname.includes('preview--main-gallery-ai');
                     
    console.log('[MainGallery] Environment detection - isPreview:', isPreview);
    
    // Extract from hash first (most common with OAuth providers)
    if (hash && hash.includes('access_token')) {
      console.log('[MainGallery] Found token in hash fragment');
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token') || '';
      const email = params.get('email');
      
      if (accessToken) {
        console.log('[MainGallery] Setting session with token from hash');
        
        // Fixed: Using the correct argument format for setSession in Supabase v2
        const { data, error } = await supabase.auth.setSession(accessToken, refreshToken);
        
        if (error) {
          console.error('[MainGallery] Error setting Supabase session:', error);
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
        
        // If data.user exists, also store the user id
        if (data?.user) {
          localStorage.setItem('main_gallery_user_id', data.user.id);
        }
        
        // Verify session is active by getting user
        const { data: userData } = await supabase.auth.getUser();
        console.log('[MainGallery] Session verification:', userData ? 'Valid' : 'Invalid');
        
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
        console.log('[MainGallery] Setting session with token from search params');
        
        // Fixed: Using the correct argument format for setSession in Supabase v2
        const { data, error } = await supabase.auth.setSession(accessToken, refreshToken);
        
        if (error) {
          console.error('[MainGallery] Error setting Supabase session from query params:', error);
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
        
        // If data.user exists, also store the user id
        if (data?.user) {
          localStorage.setItem('main_gallery_user_id', data.user.id);
        }
        
        // Verify session is active
        const { data: userData } = await supabase.auth.getUser();
        console.log('[MainGallery] Session verification after query param extraction:', userData ? 'Valid' : 'Invalid');
        
        return true;
      }
    }
    
    console.log('[MainGallery] No token found in URL hash or search params');
    return false;
  } catch (err) {
    console.error('[MainGallery] Error handling OAuth redirect:', err);
    return false;
  }
};

/**
 * Handle OAuth token directly from the URL hash
 * @param {string} [callbackUrl] Optional URL to extract token from (defaults to window.location.href)
 * @returns {Promise<boolean>} Whether token was successfully extracted and processed
 */
export const handleOAuthTokenFromHash = async (callbackUrl?: string): Promise<boolean> => {
  try {
    const url = callbackUrl || window.location.href;
    
    // Check if this is an auth callback
    if (!url.includes('callback') && !url.includes('access_token')) {
      console.log('[MainGallery] Not an auth callback URL, skipping token extraction');
      return false;
    }
    
    // Log the URL we're processing (with token partially hidden for security)
    const logUrl = url.replace(/access_token=([^&]+)/, 'access_token=****');
    console.log('[MainGallery] Processing auth callback URL:', logUrl);
    
    // Check for incorrect domain and redirect if needed
    if (url.includes('preview-main-gallery-ai.lovable.app')) {
      console.warn('[MainGallery] Detected token on preview domain - redirecting to production domain');
      const correctedURL = url.replace(
        'preview-main-gallery-ai.lovable.app',
        'main-gallery-ai.lovable.app'
      );
      window.location.href = correctedURL;
      return true;
    }
    
    // Check for development domain and adapt behavior
    const isDev = url.includes('localhost') || 
                 url.includes('127.0.0.1') ||
                 url.includes('lovableproject.com');
    
    if (isDev) {
      console.log('[MainGallery] Detected development environment');
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
          console.log('[MainGallery] Found access token in URL query parameters');
          return await processAccessToken(accessToken, params.get('refresh_token') || '', params.get('email') || 'User', isDev);
        }
      }
      
      console.log('[MainGallery] No access token found in URL hash or query');
      return false;
    }
    
    // Process the hash fragment
    const params = new URLSearchParams(hashPart);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token') || '';
    const email = params.get('email') || 'User';
    
    if (!accessToken) {
      console.log('[MainGallery] No access token found in URL hash');
      return false;
    }
    
    console.log('[MainGallery] Found access token in URL hash');
    return await processAccessToken(accessToken, refreshToken, email, isDev);
    
  } catch (err) {
    console.error('[MainGallery] Error handling OAuth token from hash:', err);
    return false;
  }
};

// Helper function to process an access token
async function processAccessToken(accessToken: string, refreshToken: string, email: string, isDev: boolean): Promise<boolean> {
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
    
    // Explicitly set Supabase session
    try {
      // Fixed: Using the correct argument format for setSession in Supabase v2
      const { data, error } = await supabase.auth.setSession(accessToken, refreshToken);
      
      if (error) {
        console.error('[MainGallery] Error setting Supabase session in processAccessToken:', error);
        return false;
      }
      
      console.log('[MainGallery] Successfully set Supabase session in processAccessToken');
      
      // If data.user exists, also store the user id
      if (data?.user) {
        localStorage.setItem('main_gallery_user_id', data.user.id);
      }
      
      // Verify session is active
      const { data: userData } = await supabase.auth.getUser();
      console.log('[MainGallery] Session verification after token processing:', userData ? 'Valid' : 'Invalid');
      
      return true;
    } catch (err) {
      console.error('[MainGallery] Error calling Supabase setSession in processAccessToken:', err);
      return false;
    }
  } catch (err) {
    console.error('[MainGallery] Error processing access token:', err);
    return false;
  }
}
