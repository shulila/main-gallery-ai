
import { logger } from '../logger.js';
import { storage, STORAGE_KEYS } from '../storage.js';
import { COOKIE_CONFIG, WEB_APP_URLS } from '../oauth-config.js';
import { syncAuthToCookies } from '../cookie-sync.js';
import { processGoogleCallback } from './google-auth.ts';

// Import type definitions
import '../../../types/auth.d.ts';

class AuthService {
  async isAuthenticated(): Promise<boolean> {
    try {
      const session = await storage.get<AuthSession>(STORAGE_KEYS.SESSION);
      
      if (!session) return false;
      
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
    try {
      logger.log('Starting Google sign-in');
      
      const token = await new Promise<string>((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(token || '');
          }
        });
      });

      if (!token) {
        return {
          success: false,
          error: 'Failed to get authentication token from Google'
        };
      }

      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!userInfoResponse.ok) {
        throw new Error(`Failed to get user info: ${userInfoResponse.status}`);
      }

      const userInfo = await userInfoResponse.json();

      const user: AuthUser = {
        id: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        provider: 'google'
      };

      const session: AuthSession = {
        provider: 'google',
        provider_token: token,
        access_token: token,
        expires_at: Date.now() + 3600 * 1000,
        created_at: Date.now(),
        user // Include user in the session
      };

      await storage.set(STORAGE_KEYS.SESSION, session);
      await storage.set(STORAGE_KEYS.USER, user);
      await syncAuthToCookies();

      return { success: true, user };
    } catch (error) {
      logger.error('Error signing in with Google:', error instanceof Error ? error.message : 'Unknown error');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred during Google authentication'
      };
    }
  }

  async signOut(): Promise<AuthResult> {
    try {
      const session = await storage.get<AuthSession>(STORAGE_KEYS.SESSION);

      if (session?.provider === 'google' && session.provider_token) {
        try {
          await new Promise<void>((resolve) => {
            chrome.identity.removeCachedAuthToken({ token: session.provider_token }, resolve);
          });
          logger.log('Removed cached auth token');
        } catch (error) {
          logger.warn('Error revoking Google token:', error);
        }
      }

      await storage.remove(STORAGE_KEYS.SESSION);
      await storage.remove(STORAGE_KEYS.USER);
      await syncAuthToCookies(true);

      return { success: true };
    } catch (error) {
      logger.error('Error signing out:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred during sign out'
      };
    }
  }

  // Add the missing processGoogleCallback method
  async processGoogleCallback(url: string): Promise<AuthResult> {
    return await processGoogleCallback(url);
  }
}

export const authService = new AuthService();
