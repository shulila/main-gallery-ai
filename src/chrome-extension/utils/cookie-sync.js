
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
 * Get session from web app cookies
 */
async function getSessionFromCookies() {
  try {
    // Get auth cookies from the web app domain
    const cookies = await new Promise((resolve, reject) => {
      chrome.cookies.getAll({ domain: COOKIE_CONFIG.DOMAIN }, (cookies) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(cookies);
        }
      });
    });
    
    // Extract session data from cookies
    const sessionCookie = cookies.find(cookie => cookie.name === COOKIE_CONFIG.SESSION_COOKIE_NAME);
    
    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }
    
    try {
      // Session cookie is usually JSON encoded and URL encoded
      const decodedValue = decodeURIComponent(sessionCookie.value);
      return JSON.parse(decodedValue);
    } catch (parseError) {
      logger.error('Error parsing session cookie:', parseError);
      return null;
    }
  } catch (error) {
    logger.error('Error getting session from cookies:', error);
    return null;
  }
}

/**
 * Set auth cookies on the web app domain
 */
async function setAuthCookies(session) {
  try {
    if (!session) {
      logger.warn('No session provided to set cookies');
      return false;
    }
    
    // Convert session object to a cookie-friendly string
    const sessionValue = encodeURIComponent(JSON.stringify(session));
    
    // Set the session cookie
    await new Promise((resolve, reject) => {
      chrome.cookies.set({
        url: WEB_APP_URLS.BASE,
        domain: COOKIE_CONFIG.DOMAIN,
        name: COOKIE_CONFIG.SESSION_COOKIE_NAME,
        value: sessionValue,
        path: '/',
        secure: true,
        httpOnly: false,
        sameSite: 'lax',
        expirationDate: Math.floor(Date.now() / 1000) + 86400 * 7 // 7 days
      }, (cookie) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(cookie);
        }
      });
    });
    
    // Set additional cookies if needed
    if (session.user) {
      const userValue = encodeURIComponent(JSON.stringify(session.user));
      await new Promise((resolve, reject) => {
        chrome.cookies.set({
          url: WEB_APP_URLS.BASE,
          domain: COOKIE_CONFIG.DOMAIN,
          name: COOKIE_CONFIG.USER_COOKIE_NAME,
          value: userValue,
          path: '/',
          secure: true,
          httpOnly: false,
          sameSite: 'lax',
          expirationDate: Math.floor(Date.now() / 1000) + 86400 * 7 // 7 days
        }, (cookie) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(cookie);
          }
        });
      });
    }
    
    return true;
  } catch (error) {
    logger.error('Error setting auth cookies:', error);
    return false;
  }
}

/**
 * Remove auth cookies from the web app domain
 */
export async function removeAuthCookies() {
  try {
    // Remove session cookie
    await new Promise((resolve, reject) => {
      chrome.cookies.remove({
        url: WEB_APP_URLS.BASE,
        name: COOKIE_CONFIG.SESSION_COOKIE_NAME
      }, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
    
    // Remove user cookie
    await new Promise((resolve, reject) => {
      chrome.cookies.remove({
        url: WEB_APP_URLS.BASE,
        name: COOKIE_CONFIG.USER_COOKIE_NAME
      }, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
    
    return true;
  } catch (error) {
    logger.error('Error removing auth cookies:', error);
    return false;
  }
}
