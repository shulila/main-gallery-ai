
/**
 * Cookie synchronization for MainGallery.AI Chrome Extension
 */

import { logger } from './logger.js';
import { storage, STORAGE_KEYS } from './storage.js';
import { COOKIE_CONFIG, WEB_APP_URLS } from './oauth-config.js';
import { validateSession } from './auth/token-validator.js';
import { supabase } from './supabaseClient.js';

/**
 * Sync authentication state with web app via cookies
 * @returns {Promise<boolean>} Success status
 */
export async function syncAuthState() {
  try {
    logger.log('Syncing auth state with web app');
    
    // Check if we have a valid session
    const session = await storage.get(STORAGE_KEYS.SESSION);
    if (!session) {
      logger.log('No session found, removing cookies');
      await removeCookies();
      return false;
    }
    
    // Validate session
    const isSessionValid = await validateSession(session);
    if (!isSessionValid) {
      logger.warn('Session is invalid, removing cookies');
      await removeCookies();
      
      // Remove invalid session
      await storage.remove(STORAGE_KEYS.SESSION);
      await storage.remove(STORAGE_KEYS.USER);
      return false;
    }
    
    // Session is valid, sync with cookies
    await setCookies(session);
    
    // Update last sync timestamp
    await storage.set(STORAGE_KEYS.LAST_SYNC, Date.now());
    
    logger.log('Auth state successfully synced with web app');
    return true;
  } catch (error) {
    logger.error('Error syncing auth state:', error);
    return false;
  }
}

/**
 * Set authentication cookies
 * @param {Object} session - Session data
 * @returns {Promise<boolean>} Success status
 */
async function setCookies(session) {
  try {
    // Serialize session data
    const sessionJson = JSON.stringify(session);
    const encodedSession = btoa(sessionJson);
    
    // Set session cookie
    await chrome.cookies.set({
      url: WEB_APP_URLS.BASE,
      domain: COOKIE_CONFIG.DOMAIN,
      name: COOKIE_CONFIG.SESSION_COOKIE_NAME,
      value: encodedSession,
      path: '/',
      secure: true,
      httpOnly: false,
      sameSite: 'Lax',
      expirationDate: Math.floor(session.expires_at / 1000)
    });
    
    // Set auth cookie with just a flag
    await chrome.cookies.set({
      url: WEB_APP_URLS.BASE,
      domain: COOKIE_CONFIG.DOMAIN,
      name: COOKIE_CONFIG.AUTH_COOKIE_NAME,
      value: 'true',
      path: '/',
      secure: true,
      httpOnly: false,
      sameSite: 'Lax',
      expirationDate: Math.floor(session.expires_at / 1000)
    });
    
    return true;
  } catch (error) {
    logger.error('Error setting cookies:', error);
    return false;
  }
}

/**
 * Remove authentication cookies
 * @returns {Promise<boolean>} Success status
 */
async function removeCookies() {
  try {
    // Remove session cookie
    await chrome.cookies.remove({
      url: WEB_APP_URLS.BASE,
      name: COOKIE_CONFIG.SESSION_COOKIE_NAME
    });
    
    // Remove auth cookie
    await chrome.cookies.remove({
      url: WEB_APP_URLS.BASE,
      name: COOKIE_CONFIG.AUTH_COOKIE_NAME
    });
    
    return true;
  } catch (error) {
    logger.error('Error removing cookies:', error);
    return false;
  }
}

/**
 * Check auth status via cookies
 * @returns {Promise<boolean>} Whether user is authenticated
 */
export async function checkAuthStatusFromCookies() {
  try {
    // Check for auth cookie
    const authCookie = await chrome.cookies.get({
      url: WEB_APP_URLS.BASE,
      name: COOKIE_CONFIG.AUTH_COOKIE_NAME
    });
    
    if (!authCookie) {
      return false;
    }
    
    // Check for session cookie
    const sessionCookie = await chrome.cookies.get({
      url: WEB_APP_URLS.BASE,
      name: COOKIE_CONFIG.SESSION_COOKIE_NAME
    });
    
    if (!sessionCookie) {
      return false;
    }
    
    // Try to parse session data
    try {
      const sessionJson = atob(sessionCookie.value);
      const session = JSON.parse(sessionJson);
      
      // Validate session
      return await validateSession(session);
    } catch (error) {
      logger.error('Error parsing session cookie:', error);
      return false;
    }
  } catch (error) {
    logger.error('Error checking auth status from cookies:', error);
    return false;
  }
}
