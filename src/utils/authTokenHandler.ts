
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
