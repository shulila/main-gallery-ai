
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
    const loggedIn = !!session;
    logger.time('isLoggedIn check result:', loggedIn);
    return loggedIn;
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
    logger.time('Opening auth page for provider:', provider);
    
    // For Google auth, use direct Chrome Identity API approach
    if (provider === 'google') {
      logger.log('Using Chrome Identity API for Google auth');
      
      // Show loading state in UI if needed
      chrome.storage.local.set({ 'auth_loading': true });
      
      // This function will be called from popup.js, not from background.js
      // So we need to send a message to background.js to handle the auth flow
      chrome.runtime.sendMessage(
        { action: 'startGoogleAuth' },
        (response) => {
          // Clear loading state
          chrome.storage.local.set({ 'auth_loading': false });
          
          if (chrome.runtime.lastError) {
            logger.error('Error starting Google auth:', chrome.runtime.lastError);
            // Notify UI of error
            chrome.storage.local.set({ 
              'auth_error': chrome.runtime.lastError.message || 'Failed to start authentication'
            });
            return;
          }
          
          if (response && response.error) {
            logger.error('Error in Google auth response:', response.error);
            // Notify UI of error
            chrome.storage.local.set({ 'auth_error': response.error });
          } else if (response && response.success) {
            logger.log('Google auth succeeded via Chrome Identity API');
            // Notify UI of success
            chrome.storage.local.set({ 'auth_success': true });
          }
        }
      );
      return;
    }
    
    // For other providers, use Supabase OAuth
    logger.log('Using Supabase OAuth for provider:', provider);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: chrome.identity.getRedirectURL()
      }
    });
    
    if (error) throw error;
    
    if (data?.url) {
      logger.log('Opening OAuth URL:', data.url);
      // Open in a new tab
      chrome.tabs.create({ url: data.url });
    }
  } catch (error) {
    logger.error(`Error opening ${provider} auth page:`, error);
    // Notify UI of error
    chrome.storage.local.set({ 'auth_error': error.message || `Failed to open ${provider} auth page` });
    throw error;
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
    logger.time('Logging out user');
    const { error } = await supabase.auth.signOut();
    
    if (error) throw error;
    
    // Notify that auth state changed
    chrome.storage.local.set({ auth_event: 'SIGNED_OUT' });
    logger.log('User logged out successfully');
    
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
    logger.log('Setting up auth callback listener');
    
    // Listen for auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
      logger.time('Auth state changed:', event);
      
      if (event === 'SIGNED_IN') {
        // User signed in, update UI or state as needed
        chrome.storage.local.set({ auth_event: 'SIGNED_IN' });
      } else if (event === 'SIGNED_OUT') {
        // User signed out, update UI or state as needed
        chrome.storage.local.set({ auth_event: 'SIGNED_OUT' });
      }
    });
    
    logger.log('Auth callback listener set up successfully');
  } catch (error) {
    logger.error('Error setting up auth callback listener:', error);
    throw error;
  }
}

/**
 * Handle auth errors and reset state
 * @returns {Promise<void>}
 */
export async function resetAuthErrors() {
  try {
    // Clear any auth errors or loading states
    await chrome.storage.local.remove(['auth_error', 'auth_loading', 'auth_success']);
    logger.log('Auth errors reset successfully');
  } catch (error) {
    logger.error('Error resetting auth errors:', error);
  }
}

/**
 * Verify token validity with Google API
 * Useful for confirming or refreshing tokens
 * @param {string} token - OAuth token to verify
 * @returns {Promise<boolean>} - Whether the token is valid
 */
export async function verifyGoogleToken(token) {
  try {
    if (!token) return false;
    
    logger.time('Verifying Google token');
    
    // Use Google's token info endpoint to verify the token
    const response = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`);
    
    if (!response.ok) {
      logger.warn('Token verification failed with status:', response.status);
      return false;
    }
    
    const data = await response.json();
    
    // Check if token has required scopes
    const hasScopes = data.scope?.includes('email') && data.scope?.includes('profile');
    
    logger.time('Token verification result:', { valid: true, hasScopes });
    return hasScopes;
  } catch (error) {
    logger.error('Error verifying Google token:', error);
    return false;
  }
}
