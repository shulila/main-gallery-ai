
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
    // For Google auth, use direct Chrome Identity API approach
    if (provider === 'google') {
      // This function will be called from popup.js, not from background.js
      // So we need to send a message to background.js to handle the auth flow
      chrome.runtime.sendMessage(
        { action: 'startGoogleAuth' },
        (response) => {
          if (chrome.runtime.lastError) {
            logger.error('Error starting Google auth:', chrome.runtime.lastError);
            return;
          }
          
          if (response && response.error) {
            logger.error('Error in Google auth response:', response.error);
          }
        }
      );
      return;
    }
    
    // For other providers, use Supabase OAuth
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: chrome.identity.getRedirectURL()
      }
    });
    
    if (error) throw error;
    
    if (data?.url) {
      // Open in a new tab
      chrome.tabs.create({ url: data.url });
    }
  } catch (error) {
    logger.error(`Error opening ${provider} auth page:`, error);
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
