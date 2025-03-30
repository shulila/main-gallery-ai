
// Auth utilities for Chrome extension

// Updated Google OAuth Client ID - this is the correct one from Google Cloud Console
const GOOGLE_CLIENT_ID = '242032861157-umrm7n18v4kvk84okgl362nj9abef8kj.apps.googleusercontent.com';

// Get the production auth callback URL - NEVER use localhost
const getProductionRedirectUrl = () => {
  return 'https://main-gallery-hub.lovable.app/auth/callback';
};

// Set up a listener for auth callback
export function setupAuthCallbackListener() {
  try {
    const redirectPattern = '*://main-gallery-hub.lovable.app/auth/callback*';
    
    // Use tabs.onUpdated to detect auth callbacks
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      // Only process completed loads with our auth callback URL
      if (changeInfo.status === 'complete' && tab.url && 
          tab.url.includes('main-gallery-hub.lovable.app/auth/callback')) {
        
        console.log('Auth callback detected:', tab.url);
        
        // Get auth token from the URL
        const url = new URL(tab.url);
        const accessToken = url.hash ? new URLSearchParams(url.hash.substring(1)).get('access_token') : null;
        const refreshToken = url.hash ? new URLSearchParams(url.hash.substring(1)).get('refresh_token') : null;
        const userEmail = url.hash ? new URLSearchParams(url.hash.substring(1)).get('email') : null;
        
        // If we have tokens, validate and store them
        if (accessToken) {
          console.log('Auth tokens detected, will store session');
          
          // Store token info and user email for extension usage
          chrome.storage.sync.set({
            'main_gallery_auth_token': {
              access_token: accessToken,
              refresh_token: refreshToken,
              timestamp: Date.now()
            },
            'main_gallery_user_email': userEmail || 'User'
          }, () => {
            console.log('Auth token and user info stored in extension storage');
            
            // Also store in localStorage for web app access if possible
            try {
              localStorage.setItem('main_gallery_auth_token', JSON.stringify({
                access_token: accessToken,
                refresh_token: refreshToken,
                timestamp: Date.now()
              }));
              localStorage.setItem('main_gallery_user_email', userEmail || 'User');
            } catch (err) {
              console.error('Error setting localStorage:', err);
            }
            
            // Close the auth tab after successful login
            setTimeout(() => {
              chrome.tabs.remove(tabId);
              
              // Open gallery in a new tab
              chrome.tabs.create({ url: 'https://main-gallery-hub.lovable.app/gallery' });
              
              // Send message to update UI in popup if open
              chrome.runtime.sendMessage({ action: 'updateUI' });
            }, 1000);
          });
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
  const authUrl = 'https://main-gallery-hub.lovable.app/auth';
  
  // Add any query parameters
  const searchParams = new URLSearchParams();
  if (options.redirect) searchParams.append('redirect', options.redirect);
  if (options.forgotPassword) searchParams.append('forgotPassword', 'true');
  if (options.signup) searchParams.append('signup', 'true');
  if (options.from) searchParams.append('from', options.from);
  
  const queryString = searchParams.toString();
  const fullAuthUrl = queryString ? `${authUrl}?${queryString}` : authUrl;
  
  // Open the URL
  if (tabId) {
    chrome.tabs.update(tabId, { url: fullAuthUrl });
  } else {
    chrome.tabs.create({ url: fullAuthUrl });
  }
  
  console.log('Opened auth URL:', fullAuthUrl);
}

// Construct Google OAuth URL directly
function constructGoogleOAuthUrl(redirectUrl) {
  // Build URL directly with the corrected client ID - NO localhost in redirectUrl
  const stateParam = Math.random().toString(36).substring(2, 15);
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUrl)}&response_type=token&scope=email%20profile&prompt=select_account&include_granted_scopes=true&state=${stateParam}`;
}

// Handle OAuth sign-in with provider
export function openAuthWithProvider(provider) {
  try {
    // For Google sign-in, we'll use a direct approach
    const redirectUrl = getProductionRedirectUrl();
    console.log(`Opening ${provider} auth with redirect to:`, redirectUrl);
    
    if (provider === 'google') {
      // Create Google OAuth URL directly - avoiding Supabase client
      const googleOAuthUrl = constructGoogleOAuthUrl(redirectUrl);
      
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

// Check if user is logged in - improved to check both extension storage and localStorage
export function isLoggedIn() {
  return new Promise((resolve) => {
    // Check if token exists in storage
    chrome.storage.sync.get(['main_gallery_auth_token'], (result) => {
      if (result.main_gallery_auth_token) {
        resolve(true);
      } else {
        // If not in extension storage, try localStorage as fallback
        try {
          const localToken = localStorage.getItem('main_gallery_auth_token');
          if (localToken) {
            // If found in localStorage, also sync to extension storage
            const parsedToken = JSON.parse(localToken);
            chrome.storage.sync.set({
              'main_gallery_auth_token': parsedToken
            });
            
            // Also get user email if available
            const userEmail = localStorage.getItem('main_gallery_user_email');
            if (userEmail) {
              chrome.storage.sync.set({
                'main_gallery_user_email': userEmail
              });
            }
            
            resolve(true);
          } else {
            resolve(false);
          }
        } catch (err) {
          console.error('Error checking localStorage:', err);
          resolve(false);
        }
      }
    });
  });
}

// Get user email if available - improved to check both sources
export function getUserEmail() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['main_gallery_user_email'], (result) => {
      if (result.main_gallery_user_email) {
        resolve(result.main_gallery_user_email);
      } else {
        // Try localStorage as fallback
        try {
          const userEmail = localStorage.getItem('main_gallery_user_email');
          if (userEmail) {
            // Also sync to extension storage
            chrome.storage.sync.set({
              'main_gallery_user_email': userEmail
            });
            resolve(userEmail);
          } else {
            resolve(null);
          }
        } catch (err) {
          console.error('Error checking localStorage for email:', err);
          resolve(null);
        }
      }
    });
  });
}

// Log out from all platforms
export function logout() {
  try {
    // Clear both extension storage and localStorage
    return new Promise((resolve) => {
      chrome.storage.sync.remove(['main_gallery_auth_token', 'main_gallery_user_email'], () => {
        console.log('Successfully logged out from extension storage');
        
        // Also clear localStorage if possible
        try {
          localStorage.removeItem('main_gallery_auth_token');
          localStorage.removeItem('main_gallery_user_email');
          console.log('Successfully logged out from localStorage');
        } catch (err) {
          console.error('Error clearing localStorage:', err);
        }
        
        resolve(true);
      });
    });
  } catch (error) {
    console.error('Logout error:', error);
    return Promise.resolve(false);
  }
}
