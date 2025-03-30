
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
  const redirectPattern = '*://main-gallery-hub.lovable.app/auth/callback*';
  
  try {
    // Listen for the auth callback on the redirect URL
    chrome.webNavigation.onCompleted.addListener(async (details) => {
      console.log('Auth navigation detected:', details.url);
      
      // Get auth token from the URL
      const url = new URL(details.url);
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
        });
        
        // Close the auth tab after successful login
        chrome.tabs.query({ url: redirectPattern }, (tabs) => {
          if (tabs && tabs.length > 0) {
            // We'll wait a moment to ensure user sees success before closing
            setTimeout(() => {
              chrome.tabs.remove(tabs[0].id);
              
              // Open gallery in a new tab
              chrome.tabs.create({ url: 'https://main-gallery-hub.lovable.app/gallery' });
            }, 2000);
          }
        });
      }
    }, { url: [{ urlMatches: redirectPattern }] });
    
    console.log('Auth callback listener set up for:', redirectPattern);
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
    const supabase = await loadSupabaseClient();
    if (!supabase) {
      console.error('Failed to initialize Supabase client');
      return;
    }
    
    const redirectUrl = getProductionRedirectUrl();
    console.log(`Opening ${provider} auth with redirect to:`, redirectUrl);
    
    // Initiate OAuth flow
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
        scopes: 'email profile'
      }
    });
    
    if (error) {
      console.error(`${provider} auth error:`, error);
    }
  } catch (error) {
    console.error(`Error during ${provider} auth:`, error);
  }
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
