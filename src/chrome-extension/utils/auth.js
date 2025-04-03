
// Auth utilities for Chrome extension

// Updated Google OAuth Client ID
const GOOGLE_CLIENT_ID = '648580197357-2v9sfcorca7060e4rdjr1904a4f1qa26.apps.googleusercontent.com';

// Get the production auth callback URL - NEVER use localhost
const getProductionRedirectUrl = () => {
  // Use the production domain
  return 'https://main-gallery-hub.lovable.app/auth/callback';
};

// Get the auth URL with environment detection
const getAuthUrl = () => {
  // Check if in preview environment
  if (typeof window !== 'undefined' && 
      window.location && 
      window.location.hostname && 
      window.location.hostname.includes('preview')) {
    return 'https://preview-main-gallery-ai.lovable.app/auth';
  }
  
  // Default to production domain
  return 'https://main-gallery-hub.lovable.app/auth';
};

// Get the gallery URL with environment detection
const getGalleryUrl = () => {
  // Check if in preview environment
  if (typeof window !== 'undefined' && 
      window.location && 
      window.location.hostname && 
      window.location.hostname.includes('preview')) {
    return 'https://preview-main-gallery-ai.lovable.app/gallery';
  }
  
  // Default to production domain
  return 'https://main-gallery-hub.lovable.app/gallery';
};

// Supported platforms for extension activation
const SUPPORTED_PLATFORMS = [
  'midjourney.com',
  'leonardo.ai',
  'openai.com',
  'dreamstudio.ai',
  'stability.ai',
  'runwayml.com',
  'pika.art',
  'discord.com/channels',
  'playgroundai.com',
  'creator.nightcafe.studio'
];

// Check if URL is supported for extension activation
function isSupportedPlatform(url) {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    return SUPPORTED_PLATFORMS.some(platform => urlObj.hostname.includes(platform) || 
      (platform.includes('discord.com') && urlObj.pathname.includes('midjourney')));
  } catch (e) {
    console.error('Invalid URL:', url);
    return false;
  }
}

// Handle Google OAuth with chrome.identity API
export async function handleGoogleLogin() {
  try {
    console.log('Initiating Google login with chrome.identity');
    
    // Define the auth parameters
    const authParams = {
      interactive: true,
      scopes: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'openid'
      ]
    };
    
    // Request authentication token
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken(authParams, async (token) => {
        if (chrome.runtime.lastError) {
          console.error('Google auth error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }
        
        if (!token) {
          console.error('No token returned from Google auth');
          reject(new Error('No token returned from Google auth'));
          return;
        }
        
        console.log('Got Google auth token, fetching user profile');
        
        try {
          // Fetch user profile with the token
          const response = await fetch(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );
          
          if (!response.ok) {
            throw new Error(`Google API error: ${response.status}`);
          }
          
          const userData = await response.json();
          console.log('Google user data:', userData);
          
          // Store auth data with expiration (24 hours)
          const tokenData = {
            access_token: token,
            refresh_token: '',
            email: userData.email,
            timestamp: Date.now(),
            expires_at: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
          };
          
          // Store token and user info in chrome storage
          chrome.storage.sync.set({
            'main_gallery_auth_token': tokenData,
            'main_gallery_user_email': userData.email
          }, () => {
            console.log('Auth data stored in chrome storage');
          });
          
          // Show success notification
          try {
            chrome.notifications.create('auth_success', {
              type: 'basic',
              iconUrl: 'icons/icon128.png',
              title: 'Login Successful',
              message: 'You are now logged in to MainGallery'
            });
          } catch (err) {
            console.error('Error showing auth success notification:', err);
          }
          
          // Open the gallery after successful login
          chrome.tabs.create({ url: getGalleryUrl() });
          
          resolve({
            success: true,
            user: userData,
            token: token
          });
        } catch (error) {
          console.error('Error fetching Google user data:', error);
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('Error in handleGoogleLogin:', error);
    throw error;
  }
}

// Set up a listener for auth callback
export function setupAuthCallbackListener() {
  try {
    console.log('Setting up auth callback listener');
    
    // Use tabs.onUpdated to detect auth callbacks
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      // Only process completed loads with our auth callback URL
      if (changeInfo.status === 'complete' && tab.url && 
          (tab.url.includes('main-gallery-hub.lovable.app/auth/callback') || 
           tab.url.includes('/auth?access_token='))) {
        
        console.log('Auth callback detected:', tab.url);
        
        // Get auth token from the URL - handle both hash and query params
        const url = new URL(tab.url);
        
        // Check for token in hash first (fragment identifier)
        const hashParams = new URLSearchParams(url.hash ? url.hash.substring(1) : '');
        const queryParams = new URLSearchParams(url.search);
        
        // Try to get token from both locations
        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
        const userEmail = hashParams.get('email') || queryParams.get('email');
        
        // If we have tokens, validate and store them
        if (accessToken) {
          console.log('Auth tokens detected, will store session');
          
          // Calculate token expiration (24 hours from now)
          const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
          
          // Store token info and user email for extension usage
          chrome.storage.sync.set({
            'main_gallery_auth_token': {
              access_token: accessToken,
              refresh_token: refreshToken,
              timestamp: Date.now(),
              expires_at: expiresAt
            },
            'main_gallery_user_email': userEmail || 'User'
          }, () => {
            console.log('Auth token and user info stored in extension storage with expiration');
            
            // Show success notification to let user know auth worked
            try {
              chrome.notifications.create('auth_success', {
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: 'Login Successful',
                message: 'You are now logged in to MainGallery'
              });
            } catch (err) {
              console.error('Error showing auth success notification:', err);
            }
            
            // Close the auth tab after successful login
            setTimeout(() => {
              chrome.tabs.remove(tabId);
              
              // Open gallery in a new tab
              chrome.tabs.create({ url: getGalleryUrl() });
              
              // Send message to update UI in popup if open
              chrome.runtime.sendMessage({ action: 'updateUI' });
            }, 1000);
          });
        } else {
          console.error('Auth callback detected but no access token found');
          
          // Show error notification
          try {
            chrome.notifications.create('auth_error', {
              type: 'basic',
              iconUrl: 'icons/icon128.png',
              title: 'Login Failed',
              message: 'Unable to login. Please try again.'
            });
          } catch (err) {
            console.error('Error showing auth error notification:', err);
          }
        }
      }
    });
    
    console.log('Auth callback listener set up using tabs API');
  } catch (error) {
    console.error('Error setting up auth callback listener:', error);
  }
}

// Open auth page with improved environment detection
export function openAuthPage(tabId = null, options = {}) {
  // Determine the correct domain based on environment
  let authUrl = getAuthUrl();
  
  // Add any query parameters
  const searchParams = new URLSearchParams();
  if (options.redirect) searchParams.append('redirect', options.redirect);
  if (options.forgotPassword) searchParams.append('forgotPassword', 'true');
  if (options.signup) searchParams.append('signup', options.signup);
  if (options.from) searchParams.append('from', options.from);
  if (options.provider) searchParams.append('provider', options.provider);
  
  const queryString = searchParams.toString();
  const fullAuthUrl = queryString ? `${authUrl}?${queryString}` : authUrl;
  
  // Log the URL we're opening for debugging
  console.log('Opening auth URL:', fullAuthUrl);
  
  // Open the URL
  if (tabId) {
    chrome.tabs.update(tabId, { url: fullAuthUrl });
  } else {
    chrome.tabs.create({ url: fullAuthUrl });
  }
  
  console.log('Opened auth URL:', fullAuthUrl);
}

// Improved Google OAuth URL construction using URLSearchParams
function constructGoogleOAuthUrl(redirectUrl) {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUrl,
    response_type: 'token',
    scope: 'profile email openid',
    include_granted_scopes: 'true',
    prompt: 'consent'
  });
  
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// Handle OAuth sign-in with provider using chrome.identity when possible
export async function signInWithGoogle() {
  try {
    console.log('Starting Google sign-in process');
    
    // First try with chrome.identity if available
    if (chrome.identity && chrome.identity.getAuthToken) {
      console.log('Using chrome.identity for Google login');
      return handleGoogleLogin();
    } 
    // Fallback to redirect flow
    else {
      console.log('chrome.identity not available, falling back to redirect flow');
      const redirectUrl = getProductionRedirectUrl();
      console.log('Using redirect URL:', redirectUrl);
      
      // Create Google OAuth URL
      const googleOAuthUrl = constructGoogleOAuthUrl(redirectUrl);
      
      // Open the OAuth URL in a new tab
      console.log('Opening Google OAuth URL:', googleOAuthUrl);
      chrome.tabs.create({ url: googleOAuthUrl });
      
      return Promise.resolve({ success: true, method: 'redirect' });
    }
  } catch (error) {
    console.error('Error during Google sign-in:', error);
    return Promise.reject(error);
  }
}

// Improved isLoggedIn to check expiration
export function isLoggedIn() {
  return new Promise((resolve) => {
    try {
      // Check for token in chrome.storage.sync with expiration validation
      chrome.storage.sync.get(['main_gallery_auth_token'], (result) => {
        const token = result.main_gallery_auth_token;
        
        if (token && token.access_token) {
          // Check if token has expiration and is still valid
          const hasExpiry = token.expires_at !== undefined;
          const isExpired = hasExpiry && Date.now() > token.expires_at;
          
          console.log('Token found, checking expiration:', 
                     hasExpiry ? `expires at ${new Date(token.expires_at).toISOString()}` : 'no expiry',
                     isExpired ? 'EXPIRED' : 'VALID');
          
          if (!isExpired) {
            // Token exists and is not expired
            resolve(true);
            return;
          } else {
            console.log('Token expired, will remove it');
            // Token exists but is expired, clean it up
            chrome.storage.sync.remove(['main_gallery_auth_token'], () => {
              resolve(false);
            });
            return;
          }
        }
        
        resolve(false);
      });
    } catch (err) {
      console.error('Error in isLoggedIn:', err);
      // If there's an error, consider the user not logged in
      resolve(false);
    }
  });
}

// Get user email if available
export function getUserEmail() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['main_gallery_user_email'], (result) => {
      resolve(result.main_gallery_user_email || null);
    });
  });
}

// Log out from all platforms
export function logout() {
  try {
    // Clear extension storage
    return new Promise((resolve) => {
      chrome.storage.sync.remove(['main_gallery_auth_token', 'main_gallery_user_email'], () => {
        console.log('Successfully logged out from extension storage');
        
        // If using chrome.identity, also revoke the Google token
        if (chrome.identity && chrome.identity.getAuthToken) {
          chrome.identity.getAuthToken({ interactive: false }, (token) => {
            if (token) {
              chrome.identity.removeCachedAuthToken({ token }, () => {
                console.log('Google auth token removed from cache');
              });
              
              // Also revoke access
              fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`)
                .then(response => console.log('Token revoked:', response.ok))
                .catch(err => console.error('Error revoking token:', err));
            }
          });
        }
        
        resolve(true);
      });
    });
  } catch (error) {
    console.error('Logout error:', error);
    return Promise.resolve(false);
  }
}

// Export the isSupportedPlatform function and URLs
export { isSupportedPlatform, getAuthUrl, getGalleryUrl, getProductionRedirectUrl };
