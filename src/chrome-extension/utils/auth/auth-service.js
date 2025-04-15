
/**
 * Authentication service for MainGallery.AI Chrome Extension
 */

import { logger } from '../logger.js';
import { storage, STORAGE_KEYS } from '../storage.js';
import { COOKIE_CONFIG, WEB_APP_URLS } from '../oauth-config.js';
import { syncAuthState } from '../cookie-sync.js';
import { signInWithGoogle, processGoogleCallback } from './google-auth.js';
import { validateSession } from './token-validator.js';

/**
 * @typedef {Object} AuthUser
 * @property {string} id - User ID
 * @property {string} email - User email
 * @property {string} name - User name
 * @property {string} picture - User profile picture URL
 * @property {string} provider - Auth provider (e.g., 'google')
 * @property {Object} user_metadata - Additional user metadata
 * @property {Object} app_metadata - Application metadata
 */

/**
 * @typedef {Object} AuthSession
 * @property {string} provider - Auth provider (e.g., 'google')
 * @property {string} provider_token - Provider-specific token
 * @property {string} access_token - Access token
 * @property {number|string} expires_at - Expiration timestamp
 * @property {AuthUser} [user] - User information
 */

/**
 * @typedef {Object} AuthResult
 * @property {boolean} success - Whether the operation was successful
 * @property {string} [error] - Error message if operation failed
 * @property {AuthUser} [user] - User information if operation succeeded
 */

class AuthService {
  /**
   * Check if user is authenticated
   * @returns {Promise<boolean>}
   */
  async isAuthenticated() {
    try {
      const session = await storage.get(STORAGE_KEYS.SESSION);
      
      if (!session) return false;
      
      if (!await validateSession(session)) {
        logger.log('Session is invalid');
        await this.signOut();
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('Error checking authentication:', error);
      return false;
    }
  }

  /**
   * Get current user
   * @returns {Promise<AuthUser|null>}
   */
  async getUser() {
    try {
      return await storage.get(STORAGE_KEYS.USER);
    } catch (error) {
      logger.error('Error getting user:', error);
      return null;
    }
  }

  /**
   * Sign in with Google
   * @returns {Promise<AuthResult>}
   */
  async signInWithGoogle() {
    return signInWithGoogle();
  }

  /**
   * Sign out
   * @returns {Promise<AuthResult>}
   */
  async signOut() {
    try {
      const session = await storage.get(STORAGE_KEYS.SESSION);
      
      if (session?.provider === 'google' && session.provider_token) {
        try {
          chrome.identity.removeCachedAuthToken(
            { token: session.provider_token },
            () => logger.log('Removed cached auth token')
          );
        } catch (error) {
          logger.warn('Error revoking Google token:', error);
        }
      }
      
      await storage.remove(STORAGE_KEYS.SESSION);
      await storage.remove(STORAGE_KEYS.USER);
      await syncAuthState();
      
      return { success: true };
    } catch (error) {
      logger.error('Error signing out:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred during sign out'
      };
    }
  }

  /**
   * Process Google callback
   * @param {string} url - Callback URL
   * @returns {Promise<AuthResult>}
   */
  async processGoogleCallback(url) {
    return processGoogleCallback(url);
  }
}

export const authService = new AuthService();
