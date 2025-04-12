
import { supabase } from "../chrome-extension/utils/supabaseClient.js";

/**
 * Utility functions for handling authentication tokens
 */

/**
 * Retrieves the current access token from Supabase session
 * @returns The current access token or null if not found
 */
export async function getCurrentAccessToken(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("[MainGallery] Error retrieving access token:", error);
      return null;
    }
    
    return data.session?.access_token || null;
  } catch (error) {
    console.error("[MainGallery] Exception retrieving access token:", error);
    return null;
  }
}

/**
 * Checks if the current user is authenticated
 * @returns True if authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("[MainGallery] Error checking authentication:", error);
      return false;
    }
    
    return !!data.session;
  } catch (error) {
    console.error("[MainGallery] Exception checking authentication:", error);
    return false;
  }
}

/**
 * Gets the user ID of the currently authenticated user
 * @returns The user ID or null if not authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error("[MainGallery] Error retrieving user ID:", error);
      return null;
    }
    
    return data.user?.id || null;
  } catch (error) {
    console.error("[MainGallery] Exception retrieving user ID:", error);
    return null;
  }
}

/**
 * Gets the user email of the currently authenticated user
 * @returns The user email or null if not authenticated
 */
export async function getCurrentUserEmail(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error("[MainGallery] Error retrieving user email:", error);
      return null;
    }
    
    return data.user?.email || null;
  } catch (error) {
    console.error("[MainGallery] Exception retrieving user email:", error);
    return null;
  }
}

/**
 * Refreshes the current session's token if needed
 * @returns True if successful, false otherwise
 */
export async function refreshTokenIfNeeded(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("[MainGallery] Error getting session for refresh:", error);
      return false;
    }
    
    if (!data.session) {
      console.log("[MainGallery] No session to refresh");
      return false;
    }
    
    // Only refresh if token is within 5 minutes of expiring
    const expiresAt = data.session.expires_at || 0;
    const fiveMinutesFromNow = Math.floor(Date.now() / 1000) + 300;
    
    if (expiresAt > fiveMinutesFromNow) {
      // Token is still valid for more than 5 minutes
      return true;
    }
    
    // Refresh the session
    const { error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.error("[MainGallery] Error refreshing token:", refreshError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("[MainGallery] Exception refreshing token:", error);
    return false;
  }
}

/**
 * Handles OAuth redirect by processing authentication token from the URL
 * @returns True if successful, false otherwise
 */
export async function handleOAuthRedirect(): Promise<boolean> {
  try {
    // Check if the URL contains a hash fragment with an access token
    const hash = window.location.hash;
    const search = window.location.search;
    
    if ((!hash || !hash.includes('access_token=')) && (!search || !search.includes('access_token='))) {
      console.log("[MainGallery] No access token found in URL");
      return false;
    }
    
    console.log("[MainGallery] Processing OAuth redirect");
    
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("[MainGallery] Error getting session:", error);
      return false;
    }
    
    if (data.session) {
      console.log("[MainGallery] Session found after OAuth redirect");
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("[MainGallery] Exception during OAuth redirect handling:", error);
    return false;
  }
}

/**
 * Extracts and processes OAuth token directly from URL hash
 * @param url The URL containing the hash with the token
 * @returns True if successful, false otherwise
 */
export function handleOAuthTokenFromHash(url: string): boolean {
  try {
    // Parse the URL hash
    const hash = new URL(url).hash;
    if (!hash || !hash.includes('access_token=')) {
      return false;
    }
    
    // Extract tokens from hash parameters
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    
    if (!accessToken) {
      console.log("[MainGallery] No access token found in hash");
      return false;
    }
    
    console.log("[MainGallery] Successfully extracted token from hash");
    
    // Store token in local storage for later use
    localStorage.setItem('supabase.auth.token', JSON.stringify({
      access_token: accessToken,
      refresh_token: refreshToken || '',
      expires_at: Date.now() + 3600 * 1000 // Default expiry of 1 hour
    }));
    
    return true;
  } catch (error) {
    console.error("[MainGallery] Error processing token from hash:", error);
    return false;
  }
}

/**
 * Gets the URL for the gallery page
 * @returns The gallery URL
 */
export function getGalleryUrl(): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/gallery`;
}
