
/**
 * Cookie synchronization utility for MainGallery.AI Chrome Extension
 * Handles syncing authentication state between the extension and web app
 */

import { logger } from './logger.js';
import { storage, STORAGE_KEYS } from './storage.js';
import { COOKIE_CONFIG, WEB_APP_URLS } from './oauth-config.js';

/**
 * Synchronize authentication state between extension and web app
 * @returns {Promise<boolean>} Whether synchronization was successful
 */
export async function syncAuthState() {
  try {
    logger.log('Syncing auth state between extension and web app');
    
    // Get session from extension storage
    const session = await storage.get(STORAGE_KEYS.SESSION);
    
    if (session) {
      // Extension has a session, set cookies in web app
      await setAuthCookies(session);
      logger.log('Auth state synced from extension to web app');
    } else {
      // Extension doesn't have a session, check if web app does
      const webAppSession = await getSessionFromCookies();
      
      if (webAppSession) {
        // Web app has a session, save it in extension
        await storage.set(STORAGE_KEYS.SESSION, webAppSession);
        
        if (webAppSession.user) {
          await storage.set(STORAGE_KEYS.USER, webAppSession.user);
        }
        
        logger.log('Auth state synced from web app to extension');
      } else {
        logger.log('No auth state to sync (both extension and web app are logged out)');
      }
    }
    
    return true;
  } catch (error) {
    logger.error('Error syncing auth state:', error);
    return false;
  }
}

/**
 * Set auth cookies in web app from session data
 * @param {Object} session Session data to set in cookies
 * @returns {Promise<boolean>} Whether cookies were set successfully
 */
export async function setAuthCookies(session) {
  try {
    if (!session) return false;
    
    // Calculate expiration
    const expiresInSeconds = session.expires_at 
      ? Math.floor((session.expires_at - Date.now()) / 1000)
      : 3600; // Default to 1 hour
    
    // Set session cookie
    await chrome.cookies.set({
      url: WEB_APP_URLS.BASE,
      name: COOKIE_CONFIG.NAMES.SESSION,
      value: JSON.stringify(session),
      domain: COOKIE_CONFIG.DOMAIN,
      path: '/',
      secure: true,
      httpOnly: false,
      sameSite: 'lax',
      expirationDate: Math.floor(Date.now() / 1000) + expiresInSeconds
    });
    
    // Set user cookie if available
    if (session.user) {
      await chrome.cookies.set({
        url: WEB_APP_URLS.BASE,
        name: COOKIE_CONFIG.NAMES.USER,
        value: JSON.stringify(session.user),
        domain: COOKIE_CONFIG.DOMAIN,
        path: '/',
        secure: true,
        httpOnly: false,
        sameSite: 'lax',
        expirationDate: Math.floor(Date.now() / 1000) + expiresInSeconds
      });
    }
    
    return true;
  } catch (error) {
    logger.error('Error setting auth cookies:', error);
    return false;
  }
}

/**
 * Remove auth cookies from web app
 * @returns {Promise<boolean>} Whether cookies were removed successfully
 */
export async function removeAuthCookies() {
  try {
    // Remove session cookie
    await chrome.cookies.remove({
      url: WEB_APP_URLS.BASE,
      name: COOKIE_CONFIG.NAMES.SESSION
    });
    
    // Remove user cookie
    await chrome.cookies.remove({
      url: WEB_APP_URLS.BASE,
      name: COOKIE_CONFIG.NAMES.USER
    });
    
    logger.log('Auth cookies removed from web app');
    return true;
  } catch (error) {
    logger.error('Error removing auth cookies:', error);
    return false;
  }
}

/**
 * Get session data from web app cookies
 * @returns {Promise<Object|null>} Session data or null if not found
 */
async function getSessionFromCookies() {
  try {
    // Get session cookie
    const sessionCookie = await chrome.cookies.get({
      url: WEB_APP_URLS.BASE,
      name: COOKIE_CONFIG.NAMES.SESSION
    });
    
    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }
    
    try {
      // Parse session data
      const session = JSON.parse(sessionCookie.value);
      
      // Get user cookie
      const userCookie = await chrome.cookies.get({
        url: WEB_APP_URLS.BASE,
        name: COOKIE_CONFIG.NAMES.USER
      });
      
      if (userCookie && userCookie.value) {
        try {
          // Add user data to session
          session.user = JSON.parse(userCookie.value);
        } catch (e) {
          logger.warn('Error parsing user cookie:', e);
        }
      }
      
      return session;
    } catch (e) {
      logger.error('Error parsing session cookie:', e);
      return null;
    }
  } catch (error) {
    logger.error('Error getting session from cookies:', error);
    return null;
  }
}

/**
 * Check if auth cookies exist in web app
 * @returns {Promise<boolean>} Whether auth cookies exist
 */
export async function hasAuthCookies() {
  try {
    const sessionCookie = await chrome.cookies.get({
      url: WEB_APP_URLS.BASE,
      name: COOKIE_CONFIG.NAMES.SESSION
    });
    
    return !!sessionCookie && !!sessionCookie.value;
  } catch (error) {
    logger.error('Error checking auth cookies:', error);
    return false;
  }
}
