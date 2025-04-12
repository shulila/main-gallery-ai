
/**
 * Authentication utilities for the extension background script
 */

// Import supabase client using relative path
import { supabase } from '../utils/supabaseClient.js';

/**
 * Sets up listeners for authentication state changes
 */
export function setupAuthListeners() {
  console.log("[MainGallery] Setting up auth listeners");
  
  // Check if we're authenticated on startup
  checkAuthStatus();
  
  // Set up interval to periodically check auth status
  setInterval(checkAuthStatus, 30 * 60 * 1000); // 30 minutes
}

/**
 * Checks the current authentication status
 */
export async function checkAuthStatus() {
  try {
    console.log("[MainGallery] Checking auth status");
    
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("[MainGallery] Error getting session:", error);
      await updateAuthState(false, null);
      return false;
    }
    
    const isAuthenticated = !!data.session;
    const userEmail = data.session?.user?.email || null;
    
    console.log("[MainGallery] Auth status:", isAuthenticated ? "Authenticated" : "Not authenticated");
    
    await updateAuthState(isAuthenticated, userEmail);
    return isAuthenticated;
  } catch (err) {
    console.error("[MainGallery] Error checking auth status:", err);
    await updateAuthState(false, null);
    return false;
  }
}

/**
 * Updates the stored authentication state
 */
async function updateAuthState(isAuthenticated, userEmail) {
  await chrome.storage.local.set({
    isAuthenticated,
    userEmail,
    lastAuthCheck: Date.now()
  });
  
  // Notify any open popups about the change
  chrome.runtime.sendMessage({
    type: 'AUTH_STATE_CHANGED',
    isAuthenticated,
    userEmail
  }).catch(() => {
    // Ignore errors if no popup is open to receive the message
  });
}

/**
 * Opens the auth page in a new tab
 */
export function openAuthPage() {
  const authUrl = 'https://main-gallery-ai.lovable.app/auth';
  
  chrome.tabs.create({ url: authUrl }, (tab) => {
    console.log("[MainGallery] Opened auth page in new tab", tab.id);
  });
}

/**
 * Handles sign out
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error("[MainGallery] Error signing out:", error);
      return false;
    }
    
    await updateAuthState(false, null);
    return true;
  } catch (err) {
    console.error("[MainGallery] Error during sign out:", err);
    return false;
  }
}
