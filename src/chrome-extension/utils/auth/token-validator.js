
/**
 * Token validator for MainGallery.AI Chrome Extension
 */

import { logger } from '../logger.js';
import { GOOGLE_CLIENT_ID } from '../oauth-config.js';

/**
 * Validate a Google OAuth token
 * @param {string} token - Google OAuth token
 * @returns {Promise<{valid: boolean, reason?: string}>}
 */
export async function validateGoogleToken(token) {
  try {
    if (!token) {
      return { valid: false, reason: 'Token is empty' };
    }
    
    // Verify token with Google
    const response = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`);
    
    if (!response.ok) {
      return { 
        valid: false, 
        reason: `Token validation failed with status: ${response.status}`
      };
    }
    
    const data = await response.json();
    
    // Check if token is for the correct client
    if (data.aud && GOOGLE_CLIENT_ID && data.aud !== GOOGLE_CLIENT_ID) {
      return { 
        valid: false, 
        reason: 'Token is for a different client'
      };
    }
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (data.exp && data.exp < now) {
      return { 
        valid: false, 
        reason: 'Token is expired'
      };
    }
    
    return { valid: true };
  } catch (error) {
    logger.error('Error validating Google token:', error);
    return { 
      valid: false, 
      reason: error instanceof Error ? error.message : 'Unknown error during token validation'
    };
  }
}

/**
 * Validate a session object
 * @param {any} session - Session object to validate
 * @returns {Promise<boolean>}
 */
export async function validateSession(session) {
  if (!session) return false;
  
  if (!session.access_token) return false;
  
  if (session.expires_at) {
    const expiryDate = new Date(session.expires_at);
    if (expiryDate < new Date()) return false;
  }
  
  if (session.provider === 'google' && session.provider_token) {
    try {
      const validation = await validateGoogleToken(session.provider_token);
      return validation.valid;
    } catch (error) {
      logger.error('Error validating Google token:', error);
      return false;
    }
  }
  
  return true;
}
