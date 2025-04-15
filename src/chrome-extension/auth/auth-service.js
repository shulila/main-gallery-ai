
/**
 * Authentication service for MainGallery.AI Chrome Extension
 */

import { logger } from '../utils/logger.js';
import { storage, STORAGE_KEYS } from '../utils/storage.js';
import { signInWithGoogle, processGoogleCallback } from './google-auth.js';
import { validateSession } from './token-validator.js';
import { createError } from '../utils/error-handler.js';

/**
 * Authentication service
 */
export const authService = {
  /**
   * Sign in with Google
   * @returns {Promise<Object>} Authentication result
   */
  signInWithGoogle: async function() {
    try {
      logger.log('Starting Google sign-in flow');
      return await signInWithGoogle();
    } catch (error) {
      logger.error('Error in signInWithGoogle:', error);
      throw error;
    }
  },
  
  /**
   * Process Google callback
   * @param {string} url - Callback URL
   * @returns {Promise<Object>} Authentication result
   */
  processGoogleCallback: async function(url) {
    try {
      logger.log('Processing Google callback');
      return await processGoogleCallback(url);
    } catch (error) {
      logger.error('Error in processGoogleCallback:', error);
      throw error;
    }
  },
  
  /**
   * Check if user is authenticated
   * @returns {Promise<boolean>} Authentication status
   */
  isAuthenticated: async function() {
    try {
      const session = await storage.get(STORAGE_KEYS.SESSION);
      if (!session) {
        return false;
      }
      
      return await validateSession(session);
    } catch (error) {
      logger.error('Error checking authentication status:', error);
      return false;
    }
  },
  
  /**
   * Get current user
   * @returns {Promise<Object|null>} User object or null
   */
  getUser: async function() {
    try {
      const user = await storage.get(STORAGE_KEYS.USER);
      return user || null;
    } catch (error) {
      logger.error('Error getting user:', error);
      return null;
    }
  },
  
  /**
   * Sign out
   * @returns {Promise<Object>} Sign out result
   */
  signOut: async function() {
    try {
      logger.log('Signing out');
      
      // Clear session and user data
      await storage.remove(STORAGE_KEYS.SESSION);
      await storage.remove(STORAGE_KEYS.USER);
      await storage.remove(STORAGE_KEYS.AUTH_STATE);
      await storage.remove(STORAGE_KEYS.AUTH_IN_PROGRESS);
      
      return { success: true };
    } catch (error) {
      logger.error('Error signing out:', error);
      throw createError('Failed to sign out', 'SIGN_OUT_ERROR');
    }
  }
};
