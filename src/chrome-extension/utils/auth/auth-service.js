
/**
 * Authentication service for MainGallery.AI Chrome Extension
 */

import { logger } from '../logger.js';
import { storage, STORAGE_KEYS } from '../storage.js';
import { COOKIE_CONFIG, WEB_APP_URLS } from '../oauth-config.js';
import { syncAuthState } from '../cookie-sync.js';
import { signInWithGoogle, processGoogleCallback } from './google-auth.js';
import { validateSession } from './token-validator.js';

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
   * @returns {Promise<Object|null>}
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
   * @returns {Promise<{success: boolean, error?: string, user?: Object}>}
   */
  async signInWithGoogle() {
    return signInWithGoogle();
  }

  /**
   * Sign out
   * @returns {Promise<{success: boolean, error?: string}>}
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
   * @returns {Promise<{success: boolean, error?: string, user?: Object}>}
   */
  async processGoogleCallback(url) {
    return processGoogleCallback(url);
  }
}

export const authService = new AuthService();
