
/**
 * Authentication utility for MainGallery.AI Chrome Extension
 * COMPATIBILITY WRAPPER for new file structure
 */

import { logger } from './logger.js';
import { authService } from '../auth/auth-service.js';

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
      // Email sign in not implemented in this version
      logger.warn('Email sign in not implemented');
    }
    return true;
  } catch (error) {
    logger.error('Error in openAuthPage wrapper:', error);
    return false;
  }
}

// Log that this compatibility module was loaded
logger.log("auth.js compatibility wrapper loaded");
