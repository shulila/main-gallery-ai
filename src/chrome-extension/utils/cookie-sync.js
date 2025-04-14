/**
 * Cookie synchronization utility for MainGallery.AI Chrome Extension
 * Handles synchronization of authentication state between extension and web app
 */

import { logger } from './logger.js';
import { storage, STORAGE_KEYS } from './storage.js';
import { COOKIE_CONFIG, WEB_APP_URLS } from './oauth-config.js';

/**
 * Synchronize authentication state between extension and web app
 */
export async function syncAuthState() {
  try {
    logger.log('Syncing auth state between extension and web app');
    
    // Check if we have the cookies permission
    const permissions = await chrome.permissions.getAll();
    if (!permissions.permissions.includes('cookies')) {
      logger.error('Missing cookies permission, cannot sync auth state');
      return false;
    }
    
    // Get session from extension storage
    const session = await storage.get(STORAGE_KEYS.SESSION);
    
    if (session) {
      // Extension has a session, set cookies in web app
      await setAuthCookies(session);
      logger.log('Auth state synced from extension to web app');
    } else {
      // Extension doesn't have a session, check web app
      const webAppSession = await getSessionFromCookies();
      
      if (webAppSession) {
        // Web app has a session, save it in extension
        await storage.set(STORAGE_KEYS.SESSION, webAppSession);
        
        if (webAppSession.user) {
          await storage.set(STORAGE_KEYS.USER, webAppSession.user);
        }
        
        logger.log('Auth state synced from web app to extension');
      } else {
        logger.log('No auth state to sync (both logged out)');
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
      value: JSON.stringify(session),
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
    
    if (session.user) {
      // Set user cookie
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
    
    logger.log('Successfully set auth cookies');
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
    await chrome.cookies.remove({
      url: WEB_APP_URLS.BASE,
      name: COOKIE_CONFIG.NAMES.SESSION
    });
    
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
 */
async function getSessionFromCookies() {
  try {
    const sessionCookie = await chrome.cookies.get({
      url: WEB_APP_URLS.BASE,
      name: COOKIE_CONFIG.NAMES.SESSION
    });
    
    if (!sessionCookie?.value) return null;
    
    const session = JSON.parse(sessionCookie.value);
    
    const userCookie = await chrome.cookies.get({
      url: WEB_APP_URLS.BASE,
      name: COOKIE_CONFIG.NAMES.USER
    });
    
    if (userCookie?.value) {
      session.user = JSON.parse(userCookie.value);
    }
    
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
