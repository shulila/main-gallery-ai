
// Auth utilities for Chrome extension
const supabaseUrl = 'https://ovhriawcqvcpagcaidlb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92aHJpYXdjcXZjcGFnY2FpZGxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2MDQxNzMsImV4cCI6MjA1ODE4MDE3M30.Hz5AA2WF31w187GkEOtKJCpoEi6JDcrdZ-dDv6d8Z7U';

// Get the production auth callback URL - NEVER use localhost
const getProductionRedirectUrl = () => {
  return 'https://main-gallery-hub.lovable.app/auth/callback';
};

// Create a Supabase client for authentication
let supabaseClient = null;

// Load the Supabase library dynamically
const loadSupabaseClient = async () => {
  try {
    if (!supabaseClient) {
      // Import Supabase from CDN for Chrome extension
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm');
      
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: localStorage,
          persistSession: true,
          autoRefreshToken: true,
          flowType: 'pkce'
        }
      });
      
      console.log('Extension: Supabase client initialized');
    }
    
    return supabaseClient;
  } catch (error) {
    console.error('Failed to load Supabase client:', error);
    return null;
  }
};

// Set up a listener for auth callback
export async function setupAuthCallbackListener() {
  // Instead of using webNavigation, we'll monitor tab updates
  // This is more compatible with MV3 restrictions
  try {
    const redirectPattern = '*://main-gallery-hub.lovable.app/auth/callback*';
    
    // Use tabs.onUpdated instead of webNavigation
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
  let authUrl = 'https://main-gallery-hub.lovable.app/auth';
  
  // Add any query parameters
  const searchParams = new URLSearchParams();
  if (options.redirect) searchParams.append('redirect', options.redirect);
  if (options.forgotPassword) searchParams.append('forgotPassword', 'true');
  if (options.signup) searchParams.append('signup', 'true');
  if (options.from) searchParams.append('from', options.from);
  
  const queryString = searchParams.toString();
  if (queryString) {
    authUrl += `?${queryString}`;
  }
  
  // Open the URL
  if (tabId) {
    chrome.tabs.update(tabId, { url: authUrl });
  } else {
    chrome.tabs.create({ url: authUrl });
  }
  
  console.log('Opened auth URL:', authUrl);
}

// Handle OAuth sign-in with provider
export async function openAuthWithProvider(provider) {
  try {
    // For Google sign-in in Chrome extension, we'll use a direct approach
    const redirectUrl = getProductionRedirectUrl();
    console.log(`Opening ${provider} auth with redirect to:`, redirectUrl);
    
    // Generate a state param for security
    const stateParam = Math.random().toString(36).substring(2, 15);
    
    // Store this state param for verification later
    chrome.storage.local.set({ 'oauth_state': stateParam });
    
    // Build the Google OAuth URL directly
    const oauthUrl = await buildProviderOAuthUrl(provider, redirectUrl, stateParam);
    
    // Open the OAuth URL in a new tab
    chrome.tabs.create({ url: oauthUrl });
    
    console.log(`Opened ${provider} OAuth URL`);
  } catch (error) {
    console.error(`Error during ${provider} auth:`, error);
  }
}

// Helper to build OAuth URLs
async function buildProviderOAuthUrl(provider, redirectUrl, stateParam) {
  // We'll use Supabase's client to get the correct OAuth URL
  const supabase = await loadSupabaseClient();
  
  if (!supabase) {
    throw new Error('Could not initialize Supabase client');
  }
  
  if (provider === 'google') {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true, // Just get the URL, don't redirect
        queryParams: {
          state: stateParam,
          prompt: 'select_account'
        }
      }
    });
    
    if (error) throw error;
    return data.url;
  }
  
  throw new Error(`Provider ${provider} not supported`);
}

// Check if user is logged in
export async function isLoggedIn() {
  try {
    // First try to get from storage for speed
    const result = await new Promise((resolve) => {
      chrome.storage.sync.get(['main_gallery_auth_token'], (result) => {
        resolve(!!result.main_gallery_auth_token);
      });
    });
    
    if (result) return true;
    
    // If not found in storage, check with Supabase
    const supabase = await loadSupabaseClient();
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      return !!data.session;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking login status:', error);
    return false;
  }
}

// Log out from all platforms
export async function logout() {
  try {
    // Clear local storage token
    await new Promise((resolve) => {
      chrome.storage.sync.remove(['main_gallery_auth_token'], resolve);
    });
    
    // Sign out from Supabase
    const supabase = await loadSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    
    console.log('Successfully logged out');
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
}
