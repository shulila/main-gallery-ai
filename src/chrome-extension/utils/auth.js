
// Auth utilities for Chrome extension

// Updated Google OAuth Client ID
const GOOGLE_CLIENT_ID = '648580197357-2v9sfcorca7060e4rdjr1904a4f1qa26.apps.googleusercontent.com';

// Get the production auth callback URL - NEVER use localhost
const getProductionRedirectUrl = () => {
  // Use the production domain
  return 'https://main-gallery-hub.lovable.app/auth/callback';
};

// Get the auth URL - using the production domain
const getAuthUrl = () => {
  return 'https://main-gallery-hub.lovable.app/auth';
};

// Get the gallery URL
const getGalleryUrl = () => {
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
  'discord.com/channels'
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

// Open auth page
export function openAuthPage(tabId = null, options = {}) {
  // Use the production domain that has Google login button
  const authUrl = getAuthUrl();
  
  // Add any query parameters
  const searchParams = new URLSearchParams();
  if (options.redirect) searchParams.append('redirect', options.redirect);
  if (options.forgotPassword) searchParams.append('forgotPassword', 'true');
  if (options.signup) searchParams.append('signup', options.signup);
  if (options.from) searchParams.append('from', options.from);
  
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

// Handle OAuth sign-in with provider
export function openAuthWithProvider(provider) {
  try {
    // For Google sign-in, we'll use a direct approach
    const redirectUrl = getProductionRedirectUrl();
    console.log(`Opening ${provider} auth with redirect to:`, redirectUrl);
    
    if (provider === 'google') {
      // Create Google OAuth URL using the improved method
      const googleOAuthUrl = constructGoogleOAuthUrl(redirectUrl);
      
      // Log the URL for debugging
      console.log(`Constructed ${provider} OAuth URL:`, googleOAuthUrl);
      
      // Open the OAuth URL in a new tab
      chrome.tabs.create({ url: googleOAuthUrl });
      
      console.log(`Opened ${provider} OAuth URL manually:`, googleOAuthUrl);
    } else {
      console.error(`Provider ${provider} not supported in direct mode`);
    }
  } catch (error) {
    console.error(`Error during ${provider} auth:`, error);
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
