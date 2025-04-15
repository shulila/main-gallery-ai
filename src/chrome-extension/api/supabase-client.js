
/**
 * Supabase client for MainGallery.AI Chrome Extension
 */

import { logger } from '../utils/logger.js';
import { storage, STORAGE_KEYS } from '../utils/storage.js';
import { createError } from '../utils/error-handler.js';

// Create a simple auth client that mimics the Supabase auth interface
class AuthClient {
  constructor() {
    this.onAuthStateChange = null;
  }

  /**
   * Get current session
   * @returns {Promise<Object>} Session data and error
   */
  async getSession() {
    try {
      const session = await storage.get(STORAGE_KEYS.SESSION);
      return { data: { session }, error: null };
    } catch (error) {
      logger.error('Error getting session:', error);
      return { data: { session: null }, error: error.message };
    }
  }

  /**
   * Set session data
   * @param {Object} session - Session data
   * @returns {Promise<Object>} Result with error
   */
  async setSession(session) {
    try {
      if (!session) {
        await storage.remove(STORAGE_KEYS.SESSION);
        await storage.remove(STORAGE_KEYS.USER);
        return { error: null };
      }
      
      await storage.set(STORAGE_KEYS.SESSION, session);
      if (session.user) {
        await storage.set(STORAGE_KEYS.USER, session.user);
      }
      
      return { error: null };
    } catch (error) {
      logger.error('Error setting session:', error);
      return { error: error.message };
    }
  }

  /**
   * Sign out user
   * @returns {Promise<Object>} Result with error
   */
  async signOut() {
    try {
      await storage.remove(STORAGE_KEYS.SESSION);
      await storage.remove(STORAGE_KEYS.USER);
      return { error: null };
    } catch (error) {
      logger.error('Error signing out:', error);
      return { error: error.message };
    }
  }
}

// Create a simple Supabase client that mimics the Supabase interface
class SupabaseClient {
  constructor() {
    this.auth = new AuthClient();
  }
}

// Create and export the Supabase client
export const supabase = new SupabaseClient();
