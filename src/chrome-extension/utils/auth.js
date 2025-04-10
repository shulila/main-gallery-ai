// Import Supabase with the correct relative path
import { supabase } from './supabaseClient.js';

/**
 * Utility functions for handling authentication within the Chrome extension.
 */

// Function to handle Google Sign-In
export const handleGoogleSignIn = async () => {
  try {
    // Sign in with Google using Supabase auth
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });

    if (error) {
      console.error('Error signing in with Google:', error.message);
      return { success: false, error: error.message };
    }

    // Return success and the authorization URL
    return { success: true, url: data.url };
  } catch (err) {
    console.error('Unexpected error during Google Sign-In:', err);
    return { success: false, error: 'Unexpected error during sign-in.' };
  }
};

// Function to handle Sign-Out
export const handleSignOut = async () => {
  try {
    // Sign out using Supabase auth
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error signing out:', error.message);
      return { success: false, error: error.message };
    }

    // Clear local storage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('main_gallery_auth_token');
    localStorage.removeItem('main_gallery_user_email');
    localStorage.removeItem('main_gallery_user_id');

    // Return success
    return { success: true };
  } catch (err) {
    console.error('Unexpected error during Sign-Out:', err);
    return { success: false, error: 'Unexpected error during sign-out.' };
  }
};

// Function to check the authentication status
export const checkAuthStatus = async () => {
  try {
    // Get the current session
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Error getting session:', error.message);
      return { isLoggedIn: false, error: error.message };
    }

    // Check if there is a session and user
    const isLoggedIn = !!(session && session.user);

    // Return the authentication status
    return { isLoggedIn };
  } catch (err) {
    console.error('Unexpected error during authentication check:', err);
    return { isLoggedIn: false, error: 'Unexpected error during authentication check.' };
  }
};
