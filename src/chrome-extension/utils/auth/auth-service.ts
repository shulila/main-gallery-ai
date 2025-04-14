
import { logger } from '../logger.js';
import { storage, STORAGE_KEYS } from '../storage.js';
import { syncAuthState, removeAuthCookies } from '../cookie-sync.js';
import { signInWithGoogle, processGoogleCallback } from './google-auth.js';

interface AuthResult {
  success: boolean;
  error?: string;
  user?: any;
  message?: string;
}

export const authService = {
  getSession: async () => {
    try {
      const session = await storage.get(STORAGE_KEYS.SESSION);
      if (!session) return null;

      if (session.expires_at && new Date(session.expires_at) < new Date()) {
        await authService.signOut();
        return null;
      }

      return session;
    } catch (error) {
      logger.error('Error getting session:', error);
      return null;
    }
  },

  getUser: async () => {
    try {
      return await storage.get(STORAGE_KEYS.USER);
    } catch (error) {
      logger.error('Error getting user:', error);
      return null;
    }
  },

  isAuthenticated: async () => {
    try {
      const session = await authService.getSession();
      return Boolean(session);
    } catch (error) {
      logger.error('Error checking auth:', error);
      return false;
    }
  },

  signInWithGoogle,
  processGoogleCallback,

  signOut: async (): Promise<AuthResult> => {
    try {
      const session = await authService.getSession();
      
      await storage.remove(STORAGE_KEYS.SESSION);
      await storage.remove(STORAGE_KEYS.USER);
      await removeAuthCookies();

      if (session?.provider === 'google' && session.provider_token) {
        try {
          await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${session.provider_token}`);
          logger.log('Google token revoked');
        } catch (error) {
          logger.warn('Error revoking Google token:', error);
        }
      }

      return { success: true };
    } catch (error: any) {
      logger.error('Error signing out:', error);
      return { success: false, error: error.message };
    }
  }
};

export async function initAuthService() {
  try {
    logger.log('Initializing auth service');
    await syncAuthState();
  } catch (error) {
    logger.error('Error initializing auth service:', error);
  }
}
