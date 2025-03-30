
// Auth utilities for Chrome extension
const supabaseUrl = 'https://ovhriawcqvcpagcaidlb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92aHJpYXdjcXZjcGFnY2FpZGxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2MDQxNzMsImV4cCI6MjA1ODE4MDE3M30.Hz5AA2WF31w187GkEOtKJCpoEi6JDcrdZ-dDv6d8Z7U';

// Hardcoded Google OAuth Client ID - PRODUCTION ONLY
const GOOGLE_CLIENT_ID = '242032861157-q1nf91k8d4lp0goopnquqg2g6em581c6.apps.googleusercontent.com';

// Get the production auth callback URL - NEVER use localhost
const getProductionRedirectUrl = () => {
  return 'https://main-gallery-hub.lovable.app/auth/callback';
};

// Set up a listener for auth callback
export function setupAuthCallbackListener() {
  // Use tabs.onUpdated instead of webNavigation
  try {
    const redirectPattern = '*://main-gallery-hub.lovable.app/auth/callback*';
    
    // Use tabs.onUpdated to detect auth callbacks
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      // Only process completed loads with our auth callback URL
      if (changeInfo.status === 'complete' && tab.url && 
          tab.url.includes('main-gallery-hub.lovable.app/auth/callback')) {
        
        console.log('Auth navigation detected:', tab.url);
        
        // Get auth token from the URL
        const url = new URL(tab.url);
        const accessToken = url.hash ? new URLSearchParams(url.hash.substring(1)).get('access_token') : null;
        const refreshToken = url.hash ? new URLSearchParams(url.hash.substring(1)).get('refresh_token') : null;
        
        // If we have tokens, validate and store them
        if (accessToken) {
          console.log('Auth tokens detected, will store session');
          
          // Store basic token info for extension usage
          chrome.storage.sync.set({
            'main_gallery_auth_token': {
              access_token: accessToken,
              refresh_token: refreshToken,
              timestamp: Date.now()
            }
          }, () => {
            console.log('Auth token stored in extension storage');
            
            // Close the auth tab after successful login
            setTimeout(() => {
              chrome.tabs.remove(tabId);
              
              // Open gallery in a new tab
              chrome.tabs.create({ url: 'https://main-gallery-hub.lovable.app/gallery' });
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
function constructGoogleOAuthUrl(redirectUrl, stateParam) {
  // Use our hardcoded client ID
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUrl)}&response_type=token&scope=email%20profile&prompt=select_account&include_granted_scopes=true&state=${stateParam}`;
}

// Handle OAuth sign-in with provider
export function openAuthWithProvider(provider) {
  try {
    // For Google sign-in, we'll use a direct approach
    const redirectUrl = getProductionRedirectUrl();
    console.log(`Opening ${provider} auth with redirect to:`, redirectUrl);
    
    // Generate a state param for security
    const stateParam = Math.random().toString(36).substring(2, 15);
    
    // Store this state param for verification later
    chrome.storage.local.set({ 'oauth_state': stateParam });
    
    if (provider === 'google') {
      // Create Google OAuth URL directly - avoiding Supabase client
      const googleOAuthUrl = constructGoogleOAuthUrl(redirectUrl, stateParam);
      
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

// Check if user is logged in
export function isLoggedIn() {
  return new Promise((resolve) => {
    // Check if token exists in storage
    chrome.storage.sync.get(['main_gallery_auth_token'], (result) => {
      resolve(!!result.main_gallery_auth_token);
    });
  });
}

// Get user email if available
export function getUserEmail() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['main_gallery_auth_token', 'main_gallery_user_email'], (result) => {
      resolve(result.main_gallery_user_email || null);
    });
  });
}

// Log out from all platforms
export function logout() {
  try {
    // Clear local storage token
    return new Promise((resolve) => {
      chrome.storage.sync.remove(['main_gallery_auth_token', 'main_gallery_user_email'], () => {
        console.log('Successfully logged out');
        resolve(true);
      });
    });
  } catch (error) {
    console.error('Logout error:', error);
    return Promise.resolve(false);
  }
}
