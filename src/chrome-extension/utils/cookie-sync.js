/**
 * Cookie synchronization utility for MainGallery.AI Chrome Extension
 * Handles synchronization of authentication state between extension and web app
 */

import { logger } from './logger.js';
import { storage, STORAGE_KEYS } from './storage.js';
import { COOKIE_CONFIG, WEB_APP_URLS } from './oauth-config.js';
import { validateSession } from './auth/token-validator.ts';

/**
 * Synchronize authentication state between extension and web app
 */
export async function syncAuthState() {
  try {
    logger.log('Syncing auth state between extension and web app');
    
    // Add a lock mechanism to prevent race conditions
    const syncInProgress = await storage.get(STORAGE_KEYS.SYNC_IN_PROGRESS);
    if (syncInProgress) {
      logger.log('Sync already in progress, skipping');
      return false;
    }
    
    // Set sync in progress flag
    await storage.set(STORAGE_KEYS.SYNC_IN_PROGRESS, true);
    
    try {
      // Check if we have the cookies permission
      const permissions = await chrome.permissions.getAll();
      if (!permissions.permissions.includes('cookies')) {
        logger.error('Missing cookies permission, cannot sync auth state');
        return false;
      }
      
      // Get session from extension storage
      const session = await storage.get(STORAGE_KEYS.SESSION);
      
      // Get auth state from web app cookies
      const webAppSession = await getSessionFromCookies();
      
      // Determine which state is more recent or valid
      if (session && webAppSession) {
        // Both have sessions, compare timestamps if available
        const extensionTimestamp = session.updated_at || session.created_at || 0;
        const webAppTimestamp = webAppSession.updated_at || webAppSession.created_at || 0;
        
        // Add additional validation for both sessions
        const extensionValid = await validateSession(session);
        const webAppValid = await validateSession(webAppSession);
        
        if (!extensionValid && !webAppValid) {
          // Both sessions are invalid, clear everything
          await removeAuthCookies();
          await storage.remove(STORAGE_KEYS.SESSION);
          await storage.remove(STORAGE_KEYS.USER);
          logger.log('Both sessions are invalid, cleared all auth data');
        } else if (!extensionValid) {
          // Extension session is invalid, use web app session
          await storage.set(STORAGE_KEYS.SESSION, webAppSession);
          if (webAppSession.user) {
            await storage.set(STORAGE_KEYS.USER, webAppSession.user);
          }
          logger.log('Extension session is invalid, synced from web app');
        } else if (!webAppValid) {
          // Web app session is invalid, use extension session
          await setAuthCookies(session);
          logger.log('Web app session is invalid, synced from extension');
        } else if (extensionTimestamp >= webAppTimestamp) {
          // Extension session is newer, sync to web app
          await setAuthCookies(session);
          logger.log('Auth state synced from extension to web app (extension session is newer)');
        } else {
          // Web app session is newer, sync to extension
          await storage.set(STORAGE_KEYS.SESSION, webAppSession);
          if (webAppSession.user) {
            await storage.set(STORAGE_KEYS.USER, webAppSession.user);
          }
          logger.log('Auth state synced from web app to extension (web app session is newer)');
        }
      } else if (session) {
        // Only extension has session, validate it first
        const extensionValid = await validateSession(session);
        if (extensionValid) {
          // Extension session is valid, sync to web app
          await setAuthCookies(session);
          logger.log('Auth state synced from extension to web app (web app has no session)');
        } else {
          // Extension session is invalid, clear it
          await storage.remove(STORAGE_KEYS.SESSION);
          await storage.remove(STORAGE_KEYS.USER);
          logger.log('Extension session is invalid, cleared extension auth data');
        }
      } else if (webAppSession) {
        // Only web app has session, validate it first
        const webAppValid = await validateSession(webAppSession);
        if (webAppValid) {
          // Web app session is valid, sync to extension
          await storage.set(STORAGE_KEYS.SESSION, webAppSession);
          if (webAppSession.user) {
            await storage.set(STORAGE_KEYS.USER, webAppSession.user);
          }
          logger.log('Auth state synced from web app to extension (extension has no session)');
        } else {
          // Web app session is invalid, clear it
          await removeAuthCookies();
          logger.log('Web app session is invalid, cleared web app auth data');
        }
      } else {
        // Neither has session, nothing to sync
        logger.log('No auth state to sync (both logged out)');
      }
      
      // Set a flag to indicate sync was performed
      await storage.set(STORAGE_KEYS.LAST_SYNC, Date.now());
      
      return true;
    } finally {
      // Always clear the sync in progress flag
      await storage.remove(STORAGE_KEYS.SYNC_IN_PROGRESS);
    }
  } catch (error) {
    // Make sure to clear the sync in progress flag even on error
    await storage.remove(STORAGE_KEYS.SYNC_IN_PROGRESS);
    
    logger.error('Error syncing auth state:', error);
    return false;
  }
}

/**
 * Set auth cookies in web app from session data
 */
export async function setAuthCookies(session) {
  try {
    if (!session) {
      logger.warn('No session data provided, cannot set auth cookies');
      return false;
    }
    
    const expiresInSeconds = session.expires_at 
      ? Math.floor((new Date(session.expires_at).getTime() - Date.now()) / 1000)
      : 3600;
    
    // Set session cookie
    await chrome.cookies.set({
      url: WEB_APP_URLS.BASE,
      name: COOKIE_CONFIG.NAMES.SESSION,
      value: typeof session === 'string' ? session : JSON.stringify(session),
      domain: COOKIE_CONFIG.DOMAIN,
      path: '/',
      secure: true,
      httpOnly: false,
      sameSite: 'lax',
      expirationDate: Math.floor(Date.now() / 1000) + expiresInSeconds
    });
    
    if (session.access_token) {
      // Set access token cookie
      await chrome.cookies.set({
        url: WEB_APP_URLS.BASE,
        name: COOKIE_CONFIG.NAMES.ACCESS_TOKEN,
        value: session.access_token,
        domain: COOKIE_CONFIG.DOMAIN,
        path: '/',
        secure: true,
        httpOnly: false,
        sameSite: 'lax',
        expirationDate: Math.floor(Date.now() / 1000) + expiresInSeconds
      });
    }
    
    if (session.refresh_token) {
      // Set refresh token cookie
      await chrome.cookies.set({
        url: WEB_APP_URLS.BASE,
        name: COOKIE_CONFIG.NAMES.REFRESH_TOKEN,
        value: session.refresh_token,
        domain: COOKIE_CONFIG.DOMAIN,
        path: '/',
        secure: true,
        httpOnly: false,
        sameSite: 'lax',
        expirationDate: Math.floor(Date.now() / 1000) + expiresInSeconds
      });
    }
    
    if (session.user) {
      // Set user cookie
      await chrome.cookies.set({
        url: WEB_APP_URLS.BASE,
        name: COOKIE_CONFIG.NAMES.USER,
        value: typeof session.user === 'string' ? session.user : JSON.stringify(session.user),
        domain: COOKIE_CONFIG.DOMAIN,
        path: '/',
        secure: true,
        httpOnly: false,
        sameSite: 'lax',
        expirationDate: Math.floor(Date.now() / 1000) + expiresInSeconds
      });
    }
    
    // Set auth state cookie to indicate logged in state
    await chrome.cookies.set({
      url: WEB_APP_URLS.BASE,
      name: COOKIE_CONFIG.NAMES.AUTH_STATE,
      value: 'authenticated',
      domain: COOKIE_CONFIG.DOMAIN,
      path: '/',
      secure: true,
      httpOnly: false,
      sameSite: 'lax',
      expirationDate: Math.floor(Date.now() / 1000) + expiresInSeconds
    });
    
    logger.log('Successfully set auth cookies');
    
    // Force refresh web app tabs to apply new auth state
    try {
      const tabs = await chrome.tabs.query({ url: `${WEB_APP_URLS.BASE}/*` });
      for (const tab of tabs) {
        await chrome.tabs.reload(tab.id);
      }
    } catch (error) {
      logger.warn('Error refreshing web app tabs:', error);
    }
    
    return true;
  } catch (error) {
    logger.error('Error setting auth cookies:', error);
    return false;
  }
}

/**
 * Remove auth cookies from web app
 */
export async function removeAuthCookies() {
  try {
    // Remove all auth-related cookies
    const cookieNames = Object.values(COOKIE_CONFIG.NAMES);
    
    for (const cookieName of cookieNames) {
      await chrome.cookies.remove({
        url: WEB_APP_URLS.BASE,
        name: cookieName
      });
    }
    
    logger.log('Auth cookies removed from web app');
    
    // Force refresh web app tabs to apply logout
    try {
      const tabs = await chrome.tabs.query({ url: `${WEB_APP_URLS.BASE}/*` });
      for (const tab of tabs) {
        await chrome.tabs.reload(tab.id);
      }
    } catch (error) {
      logger.warn('Error refreshing web app tabs:', error);
    }
    
    return true;
  } catch (error) {
    logger.error('Error removing auth cookies:', error);
    return false;
  }
}

/**
 * Get session data from web app cookies
 */
async function getSessionFromCookies() {
  try {
    // Try to get the session cookie first
    const sessionCookie = await chrome.cookies.get({
      url: WEB_APP_URLS.BASE,
      name: COOKIE_CONFIG.NAMES.SESSION
    });
    
    if (!sessionCookie?.value) {
      // No session cookie found
      return null;
    }
    
    // Parse session data
    let session;
    try {
      session = JSON.parse(sessionCookie.value);
    } catch (e) {
      // If not JSON, use as string
      session = {
        access_token: sessionCookie.value
      };
    }
    
    // Get access token if not in session
    if (!session.access_token) {
      const accessTokenCookie = await chrome.cookies.get({
        url: WEB_APP_URLS.BASE,
        name: COOKIE_CONFIG.NAMES.ACCESS_TOKEN
      });
      
      if (accessTokenCookie?.value) {
        session.access_token = accessTokenCookie.value;
      }
    }
    
    // Get refresh token if not in session
    if (!session.refresh_token) {
      const refreshTokenCookie = await chrome.cookies.get({
        url: WEB_APP_URLS.BASE,
        name: COOKIE_CONFIG.NAMES.REFRESH_TOKEN
      });
      
      if (refreshTokenCookie?.value) {
        session.refresh_token = refreshTokenCookie.value;
      }
    }
    
    // Get user data
    const userCookie = await chrome.cookies.get({
      url: WEB_APP_URLS.BASE,
      name: COOKIE_CONFIG.NAMES.USER
    });
    
    if (userCookie?.value) {
      try {
        session.user = JSON.parse(userCookie.value);
      } catch (e) {
        logger.error('Error parsing user cookie:', e);
      }
    }
    
    // Add timestamp for comparison
    session.updated_at = Date.now();
    
    return session;
  } catch (error) {
    logger.error('Error getting session from cookies:', error);
    return null;
  }
}

/**
 * Check if auth cookies exist in web app
 */
export async function hasAuthCookies() {
  try {
    // Check for session cookie
    const sessionCookie = await chrome.cookies.get({
      url: WEB_APP_URLS.BASE,
      name: COOKIE_CONFIG.NAMES.SESSION
    });
    
    if (sessionCookie?.value) {
      return true;
    }
    
    // Check for auth state cookie as fallback
    const authStateCookie = await chrome.cookies.get({
      url: WEB_APP_URLS.BASE,
      name: COOKIE_CONFIG.NAMES.AUTH_STATE
    });
    
    return !!authStateCookie && authStateCookie.value === 'authenticated';
  } catch (error) {
    logger.error('Error checking auth cookies:', error);
    return false;
  }
}
