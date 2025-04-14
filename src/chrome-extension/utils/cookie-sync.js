
/**
 * Cookie synchronization utility for MainGallery.AI Chrome Extension
 * This module handles synchronization of authentication state between the extension and the web app
 */

import { logger } from './logger.js';
import { storage, STORAGE_KEYS } from './storage.js';
import { COOKIE_CONFIG, WEB_APP_URLS } from './oauth-config.js';

/**
 * Set authentication cookies in the web app
 * @param {Object} session - Session object
 * @returns {Promise<boolean>} - Whether cookies were set successfully
 */
export async function setAuthCookies(session) {
  try {
    if (!session) {
      logger.error('No session provided for setting cookies');
      return false;
    }
    
    logger.log('Setting auth cookies in web app');
    
    // Set session cookie
    await chrome.cookies.set({
      url: WEB_APP_URLS.BASE,
      domain: COOKIE_CONFIG.DOMAIN,
      name: COOKIE_CONFIG.NAMES.SESSION,
      value: JSON.stringify(session),
      secure: true,
      httpOnly: false,
      sameSite: 'lax',
      expiresInSeconds: Math.floor((new Date(session.expires_at).getTime() - Date.now()) / 1000)
    });
    
    // Set user cookie if we have user data
    if (session.user) {
      await chrome.cookies.set({
        url: WEB_APP_URLS.BASE,
        domain: COOKIE_CONFIG.DOMAIN,
        name: COOKIE_CONFIG.NAMES.USER,
        value: JSON.stringify(session.user),
        secure: true,
        httpOnly: false,
        sameSite: 'lax',
        expiresInSeconds: Math.floor((new Date(session.expires_at).getTime() - Date.now()) / 1000)
      });
    }
    
    logger.log('Auth cookies set successfully');
    return true;
  } catch (error) {
    logger.error('Error setting auth cookies:', error);
    return false;
  }
}

/**
 * Get authentication cookies from the web app
 * @returns {Promise<Object|null>} - Session object or null if not found
 */
export async function getAuthCookies() {
  try {
    logger.log('Getting auth cookies from web app');
    
    // Get session cookie
    const sessionCookie = await chrome.cookies.get({
      url: WEB_APP_URLS.BASE,
      name: COOKIE_CONFIG.NAMES.SESSION
    });
    
    if (!sessionCookie || !sessionCookie.value) {
      logger.log('No session cookie found');
      return null;
    }
    
    try {
      // Parse session cookie
      const session = JSON.parse(sessionCookie.value);
      
      // Get user cookie
      const userCookie = await chrome.cookies.get({
        url: WEB_APP_URLS.BASE,
        name: COOKIE_CONFIG.NAMES.USER
      });
      
      if (userCookie && userCookie.value) {
        try {
          // Parse user cookie and add to session
          session.user = JSON.parse(userCookie.value);
        } catch (parseError) {
          logger.warn('Error parsing user cookie:', parseError);
        }
      }
      
      logger.log('Auth cookies retrieved successfully');
      return session;
    } catch (parseError) {
      logger.error('Error parsing session cookie:', parseError);
      return null;
    }
  } catch (error) {
    logger.error('Error getting auth cookies:', error);
    return null;
  }
}

/**
 * Remove authentication cookies from the web app
 * @returns {Promise<boolean>} - Whether cookies were removed successfully
 */
export async function removeAuthCookies() {
  try {
    logger.log('Removing auth cookies from web app');
    
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
    
    logger.log('Auth cookies removed successfully');
    return true;
  } catch (error) {
    logger.error('Error removing auth cookies:', error);
    return false;
  }
}

/**
 * Synchronize authentication state between extension and web app
 * @returns {Promise<boolean>} - Whether synchronization was successful
 */
export async function syncAuthState() {
  try {
    logger.log('Synchronizing auth state between extension and web app');
    
    // Get session from extension storage
    const extensionSession = await storage.get(STORAGE_KEYS.SESSION);
    
    // Get session from web app cookies
    const webAppSession = await getAuthCookies();
    
    if (extensionSession && !webAppSession) {
      // Extension is authenticated but web app is not, sync to web app
      logger.log('Syncing auth state from extension to web app');
      await setAuthCookies(extensionSession);
      return true;
    } else if (!extensionSession && webAppSession) {
      // Web app is authenticated but extension is not, sync to extension
      logger.log('Syncing auth state from web app to extension');
      await storage.set(STORAGE_KEYS.SESSION, webAppSession);
      await storage.set(STORAGE_KEYS.USER, webAppSession.user);
      await storage.set(STORAGE_KEYS.AUTH_STATE, 'SIGNED_IN');
      return true;
    } else if (extensionSession && webAppSession) {
      // Both are authenticated, check if they match
      const extensionExpiry = new Date(extensionSession.expires_at).getTime();
      const webAppExpiry = new Date(webAppSession.expires_at).getTime();
      
      if (extensionExpiry > webAppExpiry) {
        // Extension session is newer, sync to web app
        logger.log('Extension session is newer, syncing to web app');
        await setAuthCookies(extensionSession);
      } else if (webAppExpiry > extensionExpiry) {
        // Web app session is newer, sync to extension
        logger.log('Web app session is newer, syncing to extension');
        await storage.set(STORAGE_KEYS.SESSION, webAppSession);
        await storage.set(STORAGE_KEYS.USER, webAppSession.user);
        await storage.set(STORAGE_KEYS.AUTH_STATE, 'SIGNED_IN');
      } else {
        // Sessions are in sync
        logger.log('Auth state is already in sync');
      }
      
      return true;
    } else {
      // Neither is authenticated, nothing to sync
      logger.log('No auth state to sync');
      return true;
    }
  } catch (error) {
    logger.error('Error synchronizing auth state:', error);
    return false;
  }
}
