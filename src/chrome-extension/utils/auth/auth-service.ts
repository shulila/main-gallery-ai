
import { logger } from '../logger.js';
import { storage, STORAGE_KEYS } from '../storage.js';
import { COOKIE_CONFIG, WEB_APP_URLS } from '../oauth-config.js';
import { syncAuthState } from '../cookie-sync.js';
import { signInWithGoogle, processGoogleCallback } from './google-auth.ts';
import { validateSession } from './token-validator.ts';

// Import types with correct path and extension
import type { AuthUser, AuthSession, AuthResult } from '../types/auth.d.ts';

class AuthService {
  async isAuthenticated(): Promise<boolean> {
    try {
      const session = await storage.get<AuthSession>(STORAGE_KEYS.SESSION);
      
      if (!session) return false;
      
      // Validate the session
      const isValid = await validateSession(session);
      if (!isValid) {
        logger.log('Session is invalid');
        await this.signOut();
        return false;
      }
      
      if (session.expires_at && new Date(session.expires_at) < new Date()) {
        logger.log('Session expired');
        await this.signOut();
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('Error checking authentication:', error);
      return false;
    }
  }

  async getUser(): Promise<AuthUser | null> {
    try {
      return await storage.get<AuthUser>(STORAGE_KEYS.USER);
    } catch (error) {
      logger.error('Error getting user:', error);
      return null;
    }
  }

  async signInWithGoogle(): Promise<AuthResult> {
    return signInWithGoogle();
  }

  async signOut(): Promise<AuthResult> {
    try {
      const session = await storage.get<AuthSession>(STORAGE_KEYS.SESSION);

      if (session?.provider === 'google' && session.provider_token) {
        try {
          await new Promise<void>((resolve, reject) => {
            chrome.identity.removeCachedAuthToken(
              { token: session.provider_token }, 
              () => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
                } else {
                  resolve();
                }
              }
            );
          });
          logger.log('Removed cached auth token');
        } catch (error) {
          logger.warn('Error revoking Google token:', error);
        }
      }

      await storage.remove(STORAGE_KEYS.SESSION);
      await storage.remove(STORAGE_KEYS.USER);
      
      // Sync to web app (remove cookies)
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

  // Process Google callback
  async processGoogleCallback(url: string): Promise<AuthResult> {
    return await processGoogleCallback(url);
  }
}

export const authService = new AuthService();
