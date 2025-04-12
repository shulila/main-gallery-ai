
/**
 * Auth utilities for Chrome Extension
 * Fixed version that works with the Service Worker compatible Supabase client
 */

import { supabase } from './supabaseClient.js';
import { logger } from './logger.js';

/**
 * Check if user is logged in
 * @returns {Promise<boolean>} Whether the user is logged in
 */
export async function isLoggedIn() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  } catch (error) {
    logger.error('Error checking login status:', error);
    return false;
  }
}

/**
 * Open auth page for specified provider
 * @param {string} provider - Auth provider (google, facebook, etc.)
 * @returns {Promise<void>}
 */
export async function openAuthPage(provider = 'google') {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: chrome.identity.getRedirectURL()
      }
    });
    
    if (error) throw error;
    
    if (data?.url) {
      // For Google auth, use Chrome Identity API
      if (provider === 'google') {
        chrome.identity.launchWebAuthFlow({
          url: data.url,
          interactive: true
        }, (responseUrl) => {
          if (chrome.runtime.lastError) {
            logger.error('Auth flow error:', chrome.runtime.lastError);
            return;
          }
          
          if (!responseUrl) {
            logger.error('No response URL from auth flow');
            return;
          }
          
          // Extract the access token from the response URL
          const url = new URL(responseUrl);
          const hashParams = new URLSearchParams(url.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          
          if (!accessToken) {
            logger.error('No access token in response');
            return;
          }
          
          // Handle the token with our custom method
          supabase.auth.handleOAuthToken(accessToken, 'google')
            .then(result => {
              if (result.error) {
                logger.error('Error handling OAuth token:', result.error);
              } else {
                logger.log('Successfully authenticated with Google');
                // Notify that auth state changed
                chrome.storage.local.set({ auth_event: 'SIGNED_IN' });
              }
            })
            .catch(err => {
              logger.error('Error in OAuth token handling:', err);
            });
        });
      } else {
        // For other providers, open in a new tab
        chrome.tabs.create({ url: data.url });
      }
    }
  } catch (error) {
    logger.error(`Error opening ${provider} auth page:`, error);
    throw error;
  }
}

/**
 * Handle in-popup Google login without redirects
 * @returns {Promise<{success: boolean, user?: any, error?: string}>}
 */
export async function handleInPopupGoogleLogin() {
  try {
    logger.log('Starting in-popup Google login flow...');
    
    return new Promise((resolve, reject) => {
      // Get the redirect URL from Chrome Identity
      const redirectURL = chrome.identity.getRedirectURL();
      
      // Get the client ID from manifest
      const manifest = chrome.runtime.getManifest();
      const clientId = manifest.oauth2?.client_id;
      
      if (!clientId) {
        reject(new Error('OAuth client ID not found in manifest'));
        return;
      }
      
      // Set up auth parameters
      const scopes = manifest.oauth2?.scopes || ['openid', 'email', 'profile'];
      
      // Build the auth URL
      const authURL = new URL('https://accounts.google.com/o/oauth2/auth');
      authURL.searchParams.append('client_id', clientId);
      authURL.searchParams.append('response_type', 'token');
      authURL.searchParams.append('redirect_uri', redirectURL);
      authURL.searchParams.append('scope', scopes.join(' '));
      
      // Launch the web auth flow
      chrome.identity.launchWebAuthFlow(
        { url: authURL.toString(), interactive: true },
        async (responseUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          if (!responseUrl) {
            reject(new Error('No response URL'));
            return;
          }
          
          try {
            // Parse the response URL
            const url = new URL(responseUrl);
            const fragment = url.hash.substring(1);
            const params = new URLSearchParams(fragment);
            const token = params.get('access_token');
            
            if (!token) {
              reject(new Error('No access token found in response'));
              return;
            }
            
            // Process the token with our custom handler
            const result = await supabase.auth.handleOAuthToken(token, 'google');
            
            if (result.error) {
              reject(new Error(result.error.message || 'Authentication failed'));
              return;
            }
            
            // Success - return user data
            resolve({
              success: true,
              user: result.data?.user || result.data?.session?.user
            });
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    logger.error('Error in handleInPopupGoogleLogin:', error);
    return { success: false, error: error.message || 'Authentication failed' };
  }
}

/**
 * Handle email/password login
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function handleEmailPasswordLogin(email, password) {
  try {
    // For email/password login, we'll need to use a different approach
    // since Supabase's signInWithPassword might not work in Service Worker
    
    // Create a basic auth header
    const credentials = btoa(`${email}:${password}`);
    
    // Make a direct request to Supabase auth API
    const response = await fetch(`${supabaseConfig.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
        'apikey': supabaseConfig.key
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error_description || data.error || 'Login failed');
    }
    
    // Store the session data
    const sessionData = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in * 1000),
      token_type: data.token_type,
      user: data.user
    };
    
    // Store in chrome.storage
    await new Promise((resolve, reject) => {
      chrome.storage.local.set({
        'supabase_session': sessionData,
        'supabase_user': data.user
      }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
    
    // Notify that auth state changed
    chrome.storage.local.set({ auth_event: 'SIGNED_IN' });
    
    return { success: true };
  } catch (error) {
    logger.error('Error logging in with email/password:', error);
    return { 
      success: false, 
      error: error.message || 'Login failed. Please try again.'
    };
  }
}

/**
 * Get current user's email
 * @returns {Promise<string|null>} User email or null if not logged in
 */
export async function getUserEmail() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.email || null;
  } catch (error) {
    logger.error('Error getting user email:', error);
    return null;
  }
}

/**
 * Log out current user
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function logout() {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) throw error;
    
    // Notify that auth state changed
    chrome.storage.local.set({ auth_event: 'SIGNED_OUT' });
    
    return { success: true };
  } catch (error) {
    logger.error('Error logging out:', error);
    return { 
      success: false, 
      error: error.message || 'Logout failed. Please try again.'
    };
  }
}

/**
 * Set up listener for auth callback
 * @returns {Promise<void>}
 */
export async function setupAuthCallbackListener() {
  try {
    // Listen for auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
      logger.log('Auth state changed:', event);
      
      if (event === 'SIGNED_IN') {
        // User signed in, update UI or state as needed
        chrome.storage.local.set({ auth_event: 'SIGNED_IN' });
      } else if (event === 'SIGNED_OUT') {
        // User signed out, update UI or state as needed
        chrome.storage.local.set({ auth_event: 'SIGNED_OUT' });
      }
    });
  } catch (error) {
    logger.error('Error setting up auth callback listener:', error);
    throw error;
  }
}
