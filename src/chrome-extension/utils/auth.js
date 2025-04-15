
/**
 * Authentication utility for MainGallery.AI Chrome Extension
 * COMPATIBILITY WRAPPER for new file structure
 */

import { logger } from './logger.js';
import { authService } from './auth/auth-service.js';

/**
 * Check if user is logged in
 * @returns {Promise<boolean>} Authentication status
 */
export async function isLoggedIn() {
  try {
    return await authService.isAuthenticated();
  } catch (error) {
    logger.error('Error in isLoggedIn wrapper:', error);
    return false;
  }
}

/**
 * Get user email
 * @returns {Promise<string|null>} User email or null
 */
export async function getUserEmail() {
  try {
    const user = await authService.getUser();
    return user?.email || null;
  } catch (error) {
    logger.error('Error in getUserEmail wrapper:', error);
    return null;
  }
}

/**
 * Sign out user
 * @returns {Promise<boolean>} Success status
 */
export async function logout() {
  try {
    await authService.signOut();
    return true;
  } catch (error) {
    logger.error('Error in logout wrapper:', error);
    return false;
  }
}

/**
 * Open auth page for sign in
 * @param {string} provider - Auth provider (google, email)
 * @returns {Promise<boolean>} Success status
 */
export async function openAuthPage(provider = 'google') {
  try {
    if (provider === 'google') {
      await authService.signInWithGoogle();
    } else {
      // Email sign in handled elsewhere
      logger.warn('Email sign in should be handled in popup.js');
    }
    return true;
  } catch (error) {
    logger.error('Error in openAuthPage wrapper:', error);
    return false;
  }
}

/**
 * Handle email and password login 
 * Improved implementation that was missing
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} Login result
 */
export async function handleEmailPasswordLogin(email, password) {
  try {
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }
    
    logger.log('Attempting email login');
    
    // Use Supabase client from the app for authentication
    const { data, error } = await fetch('https://main-gallery-ai.lovable.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }).then(r => r.json());
    
    if (error) {
      logger.error('Email login failed:', error);
      return { success: false, error: error.message || 'Authentication failed' };
    }
    
    if (!data || !data.user) {
      return { success: false, error: 'Invalid response from authentication server' };
    }
    
    // Store user data manually since this is outside of authService
    await authService.setSession({
      user: data.user,
      provider: 'email',
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      expires_at: Date.now() + (3600 * 1000), // 1 hour
      created_at: Date.now()
    });
    
    return { success: true, user: data.user };
  } catch (error) {
    logger.error('Error in email/password login:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error during login'
    };
  }
}

// Log that this compatibility module was loaded
logger.log("auth.js compatibility wrapper loaded");
