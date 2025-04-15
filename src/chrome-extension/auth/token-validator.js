
/**
 * Token validator for MainGallery.AI Chrome Extension
 */

import { logger } from '../utils/logger.js';
import { createError } from '../utils/error-handler.js';

/**
 * Validate session token
 * @param {Object} session - Session object to validate
 * @returns {Promise<boolean>} Whether session is valid
 */
export async function validateSession(session) {
  try {
    // Check if session exists
    if (!session) {
      logger.warn('Session is null or undefined');
      return false;
    }
    
    // Check if access token exists
    if (!session.access_token) {
      logger.warn('Session has no access token');
      return false;
    }
    
    // Check if token has expired
    const expiresAt = session.expires_at;
    if (!expiresAt || Date.now() >= expiresAt) {
      logger.warn('Session token has expired');
      return false;
    }
    
    // Check if user info exists
    if (!session.user || !session.user.id) {
      logger.warn('Session has no user information');
      return false;
    }
    
    // If we got here, token is valid
    return true;
  } catch (error) {
    logger.error('Error validating session:', error);
    return false;
  }
}

/**
 * Validate access token with Google
 * @param {string} accessToken - Access token to validate
 * @returns {Promise<boolean>} Whether token is valid
 */
export async function validateGoogleToken(accessToken) {
  try {
    // Check if token exists
    if (!accessToken) {
      return false;
    }
    
    // Call Google token info endpoint
    const response = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${accessToken}`);
    
    // If response is not OK, token is invalid
    if (!response.ok) {
      return false;
    }
    
    // Token is valid
    return true;
  } catch (error) {
    logger.error('Error validating Google token:', error);
    return false;
  }
}
