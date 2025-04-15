
import { logger } from '../logger.js';
import { storage, STORAGE_KEYS } from '../storage.js';
import { syncAuthState } from '../cookie-sync.js';
import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES } from '../oauth-config.js';
import { validateGoogleToken } from './token-validator.ts';

// Import types with correct path and extension
import type { AuthUser, AuthSession, AuthResult, UserInfo } from '../types/auth.d.ts';

/**
 * Get user info from Google API
 */
async function getUserInfo(accessToken: string): Promise<UserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error(`Failed to get user info: ${response.status}`);
  }

  return response.json();
}

/**
 * Sign in with Google using chrome.identity API
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    logger.log('Initiating Google sign in with chrome.identity');

    return new Promise<AuthResult>((resolve) => {
      chrome.identity.getAuthToken({ 
        interactive: true,
        scopes: GOOGLE_SCOPES
      }, async (token) => {
        if (chrome.runtime.lastError) {
          const error = chrome.runtime.lastError;
          logger.error('Error getting auth token:', error);
          
          // Categorize errors for better handling
          let errorMessage = error.message || 'No authentication token received';
          if (error.message?.includes('canceled')) {
            errorMessage = 'Authentication was canceled by the user';
          } else if (error.message?.includes('network')) {
            errorMessage = 'Network error during authentication. Please check your connection';
          }
          
          return resolve({
            success: false,
            error: errorMessage
          });
        }

        if (!token) {
          return resolve({
            success: false,
            error: 'No authentication token received'
          });
        }

        try {
          // Validate the token first
          const tokenValidation = await validateGoogleToken(token);
          if (!tokenValidation.valid) {
            logger.error('Invalid Google token:', tokenValidation.reason);
            return resolve({
              success: false,
              error: `Authentication failed: ${tokenValidation.reason}`
            });
          }
          
          const userInfo = await getUserInfo(token);
          
          const user: AuthUser = {
            id: userInfo.sub,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
            provider: 'google',
            user_metadata: {
              full_name: userInfo.name,
              avatar_url: userInfo.picture
            },
            app_metadata: {
              provider: 'google'
            }
          };

          const session: AuthSession = {
            provider: 'google',
            provider_token: token,
            access_token: token,
            expires_at: Date.now() + 3600 * 1000,
            created_at: Date.now(),
            user
          };

          await storage.set(STORAGE_KEYS.SESSION, session);
          await storage.set(STORAGE_KEYS.USER, user);
          await syncAuthState();

          return resolve({
            success: true,
            user
          });
        } catch (error: any) {
          logger.error('Error processing Google auth token:', error);
          return resolve({
            success: false,
            error: error.message
          });
        }
      });
    });
  } catch (error: any) {
    logger.error('Error in signInWithGoogle:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Process Google callback URL
 */
export async function processGoogleCallback(url: string): Promise<AuthResult> {
  try {
    if (!url) {
      return { success: false, error: 'No callback URL provided' };
    }

    const hashParams = new URLSearchParams(url.split('#')[1] || '');
    const queryParams = new URLSearchParams(url.split('?')[1] || '');
    
    const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
    
    if (!accessToken) {
      return { success: false, error: 'No access token found in callback URL' };
    }
    
    // Validate the token first
    const tokenValidation = await validateGoogleToken(accessToken);
    if (!tokenValidation.valid) {
      logger.error('Invalid Google token:', tokenValidation.reason);
      return {
        success: false,
        error: `Authentication failed: ${tokenValidation.reason}`
      };
    }

    const userInfo = await getUserInfo(accessToken);

    const user: AuthUser = {
      id: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      provider: 'google',
      user_metadata: {
        full_name: userInfo.name,
        avatar_url: userInfo.picture
      },
      app_metadata: {
        provider: 'google'
      }
    };

    const session: AuthSession = {
      provider: 'google',
      provider_token: accessToken,
      access_token: accessToken,
      expires_at: Date.now() + 3600 * 1000,
      created_at: Date.now(),
      user
    };

    await storage.set(STORAGE_KEYS.SESSION, session);
    await storage.set(STORAGE_KEYS.USER, user);
    await syncAuthState();

    return { success: true, user };
  } catch (error: any) {
    logger.error('Error processing Google callback:', error);
    return { success: false, error: error.message };
  }
}
