
/**
 * Supabase client wrapper for Chrome Extension
 * Fixed version that works in Service Worker context
 */

// Using hardcoded values for the extension
const SUPABASE_URL = "https://ovhriawcqvcpagcaidlb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92aHJpYXdjcXZjcGFnY2FpZGxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2MDQxNzMsImV4cCI6MjA1ODE4MDE3M30.Hz5AA2WF31w187GkEOtKJCpoEi6JDcrdZ-dDv6d8Z7U";

// Create a minimal mock client that works in Service Worker context
// This avoids the dynamic import() which is not allowed in Service Workers
const supabaseClient = {
  auth: {
    getSession: () => {
      return new Promise((resolve) => {
        // Try to get session from storage
        chrome.storage.local.get(['supabase_session'], (result) => {
          if (chrome.runtime.lastError) {
            console.error('Error getting session from storage:', chrome.runtime.lastError);
            resolve({ data: { session: null }, error: chrome.runtime.lastError });
            return;
          }
          
          const session = result.supabase_session || null;
          resolve({ data: { session }, error: null });
        });
      });
    },
    
    getUser: () => {
      return new Promise((resolve) => {
        // Try to get user from storage
        chrome.storage.local.get(['supabase_user'], (result) => {
          if (chrome.runtime.lastError) {
            console.error('Error getting user from storage:', chrome.runtime.lastError);
            resolve({ data: { user: null }, error: chrome.runtime.lastError });
            return;
          }
          
          const user = result.supabase_user || null;
          resolve({ data: { user }, error: null });
        });
      });
    },
    
    signInWithOAuth: (options) => {
      return new Promise((resolve) => {
        const { provider, options: authOptions } = options;
        
        // For Google auth, we'll use a different approach
        // We'll just return a signal to use direct Google auth
        if (provider === 'google') {
          resolve({ 
            data: { provider: 'google' }, 
            error: null 
          });
        } else {
          // For other providers, construct a URL to the Supabase auth page
          const authUrl = new URL(`${SUPABASE_URL}/auth/v1/authorize`);
          authUrl.searchParams.append('provider', provider);
          authUrl.searchParams.append('redirect_to', authOptions?.redirectTo || '');
          
          resolve({ data: { url: authUrl.toString() }, error: null });
        }
      });
    },
    
    // Handle the OAuth token received from Chrome Identity API
    handleOAuthToken: (token, provider = 'google') => {
      return new Promise((resolve) => {
        // Store the token in local storage
        const sessionData = {
          provider_token: token,
          provider,
          provider_refresh_token: null,
          access_token: token, // Use the OAuth token as access token
          expires_at: Date.now() + 3600000, // 1 hour expiry
          refresh_token: null,
          token_type: 'bearer',
          user: {
            id: 'temp-user-id',
            email: null, // Will be fetched separately
            app_metadata: { provider },
            user_metadata: {},
            aud: 'authenticated'
          }
        };
        
        // Store the session
        chrome.storage.local.set({ 'supabase_session': sessionData }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error storing session:', chrome.runtime.lastError);
            resolve({ data: null, error: chrome.runtime.lastError });
            return;
          }
          
          // Fetch user info from Google
          fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` }
          }) 
            .then(response => response.json())
            .then(userData => {
              // Update user data with email and other info
              const user = {
                ...sessionData.user,
                email: userData.email,
                user_metadata: {
                  full_name: userData.name,
                  avatar_url: userData.picture
                }
              };
              
              // Store updated user data
              chrome.storage.local.set({ 'supabase_user': user }, () => {
                if (chrome.runtime.lastError) {
                  console.error('Error storing user data:', chrome.runtime.lastError);
                  resolve({ data: { session: sessionData }, error: chrome.runtime.lastError });
                  return;
                }
                
                // Update session with user data
                sessionData.user = user;
                chrome.storage.local.set({ 'supabase_session': sessionData }, () => {
                  resolve({ data: { session: sessionData, user }, error: null });
                });
              });
            })
            .catch(error => {
              console.error('Error fetching user info:', error);
              resolve({ data: { session: sessionData }, error });
            });
        });
      });
    },
    
    signOut: () => {
      return new Promise((resolve) => {
        // Clear session and user data from storage
        chrome.storage.local.remove(['supabase_session', 'supabase_user'], () => {
          if (chrome.runtime.lastError) {
            console.error('Error clearing auth data:', chrome.runtime.lastError);
            resolve({ error: chrome.runtime.lastError });
            return;
          }
          
          resolve({ error: null });
        });
      });
    },
    
    // Set up a listener for auth state changes
    onAuthStateChange: (callback) => {
      // Use Chrome storage onChanged event to detect auth changes
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') return;
        
        if (changes.supabase_session) {
          const newSession = changes.supabase_session.newValue;
          const oldSession = changes.supabase_session.oldValue;
          
          if (!oldSession && newSession) {
            // User signed in
            callback('SIGNED_IN', newSession);
          } else if (oldSession && !newSession) {
            // User signed out
            callback('SIGNED_OUT', null);
          } else if (oldSession && newSession) {
            // Session updated
            callback('TOKEN_REFRESHED', newSession);
          }
        }
      });
      
      // Return a function to remove the listener (not used in this context)
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
  }
};

// Log that this module was loaded
console.log("[MainGallery] supabaseClient.js loaded");

// Export the client - make sure we use both export styles for compatibility
export default supabaseClient; 
export const supabase = supabaseClient;

// Also export config for use in other modules
export const supabaseConfig = {
  url: SUPABASE_URL,
  key: SUPABASE_PUBLISHABLE_KEY
};
