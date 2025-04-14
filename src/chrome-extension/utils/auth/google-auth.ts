
import { logger } from '../logger.js';
import { storage, STORAGE_KEYS } from '../storage.js';
import { syncAuthState } from '../cookie-sync.js';
import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES, WEB_APP_URLS } from '../oauth-config.js';

interface AuthResult {
  success: boolean;
  error?: string;
  user?: any;
}

interface UserInfo {
  sub: string;
  email: string;
  name: string;
  picture: string;
}

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
      chrome.identity.getAuthToken({ interactive: true }, async (token) => {
        if (chrome.runtime.lastError) {
          logger.error('Error getting auth token:', chrome.runtime.lastError);
          return resolve({
            success: false,
            error: chrome.runtime.lastError.message
          });
        }

        if (!token) {
          return resolve({
            success: false,
            error: 'No authentication token received'
          });
        }

        try {
          const userInfo = await getUserInfo(token);
          
          const user = {
            id: userInfo.sub,
            email: userInfo.email,
            user_metadata: {
              full_name: userInfo.name,
              avatar_url: userInfo.picture
            },
            app_metadata: {
              provider: 'google'
            }
          };

          const session = {
            provider: 'google',
            provider_token: token,
            access_token: token,
            expires_at: Date.now() + 3600 * 1000,
            user,
            created_at: Date.now()
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

    const userInfo = await getUserInfo(accessToken);

    const user = {
      id: userInfo.sub,
      email: userInfo.email,
      user_metadata: {
        full_name: userInfo.name,
        avatar_url: userInfo.picture
      },
      app_metadata: {
        provider: 'google' 
      }
    };

    const session = {
      provider: 'google',
      provider_token: accessToken,
      access_token: accessToken,
      expires_at: Date.now() + 3600 * 1000,
      user,
      created_at: Date.now()
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
