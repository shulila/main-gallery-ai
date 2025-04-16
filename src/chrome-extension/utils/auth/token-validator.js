
/**
 * Token validator for MainGallery.AI Chrome Extension
 */

import { logger } from '../logger.js';
import { GOOGLE_CLIENT_ID } from '../oauth-config.js';

/**
 * @typedef {Object} TokenValidationResult
 * @property {boolean} valid - Whether the token is valid
 * @property {string} [reason] - Reason for invalid token
 * @property {Object} [details] - Additional details
 */

/**
 * Validate a Google OAuth token with improved error handling
 * @param {string} token - Google OAuth token
 * @returns {Promise<TokenValidationResult>} Validation result
 */
export async function validateGoogleToken(token) {
  try {
    if (!token) {
      return { valid: false, reason: 'Token is empty' };
    }
    
    // Verify token with Google
    let response;
    try {
      response = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`);
    } catch (error) {
      return { 
        valid: false, 
        reason: `Network error validating token: ${error.message || 'Unknown error'}`,
        details: { errorType: 'network' }
      };
    }
    
    if (!response.ok) {
      // Handle specific error cases
      if (response.status === 400) {
        return { 
          valid: false, 
          reason: 'Invalid token format or expired token',
          details: { status: response.status, errorType: 'invalid_token' }
        };
      } else if (response.status === 401) {
        return { 
          valid: false, 
          reason: 'Unauthorized: token might be revoked',
          details: { status: response.status, errorType: 'unauthorized' }
        };
      }
      
      return { 
        valid: false, 
        reason: `Token validation failed with status: ${response.status}`,
        details: { status: response.status, statusText: response.statusText }
      };
    }
    
    let data;
    try {
      data = await response.json();
    } catch (error) {
      return { 
        valid: false, 
        reason: `Error parsing token validation response: ${error.message || 'Unknown error'}`,
        details: { errorType: 'parsing' }
      };
    }
    
    // Check if token was issued for our client ID
    if (data.aud) {
      // Get client ID from manifest for runtime check
      const manifest = chrome.runtime.getManifest();
      const manifestClientId = manifest.oauth2?.client_id;
      const configClientId = GOOGLE_CLIENT_ID;
      
      // Use manifest client ID as first priority, fallback to config
      const expectedClientId = manifestClientId || configClientId;
      
      if (expectedClientId && data.aud !== expectedClientId) {
        return { 
          valid: false, 
          reason: 'Token was issued for a different client',
          details: { expected: expectedClientId, actual: data.aud }
        };
      }
    }
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (data.exp && data.exp < now) {
      return { 
        valid: false, 
        reason: 'Token is expired',
        details: { expiresAt: data.exp, now, expiredFor: now - data.exp }
      };
    }
    
    return { 
      valid: true, 
      details: { 
        sub: data.sub, 
        email: data.email,
        expires_in: data.exp ? (data.exp - now) : undefined
      } 
    };
  } catch (error) {
    logger.error('Error validating Google token:', error);
    return { 
      valid: false, 
      reason: error instanceof Error ? error.message : 'Unknown error during token validation'
    };
  }
}

/**
 * Validate a session object with improved null checking
 * @param {any} session - Session object to validate
 * @returns {Promise<boolean>} Whether the session is valid
 */
export async function validateSession(session) {
  try {
    if (!session) {
      logger.warn('Session is null or undefined');
      return false;
    }
    
    if (!session.access_token) {
      logger.warn('Session has no access token');
      return false;
    }
    
    if (session.expires_at) {
      const expiresAt = typeof session.expires_at === 'string' 
        ? new Date(session.expires_at).getTime()
        : session.expires_at;
        
      if (isNaN(expiresAt) || expiresAt < Date.now()) {
        logger.warn('Session is expired');
        return false;
      }
    }
    
    if (!session.user || !session.user.id) {
      logger.warn('Session has no user information');
      return false;
    }
    
    if (session.provider === 'google' && session.provider_token) {
      try {
        const validation = await validateGoogleToken(session.provider_token);
        if (!validation.valid) {
          logger.warn('Google token validation failed:', validation.reason);
          return false;
        }
      } catch (error) {
        logger.error('Error validating Google token:', error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    logger.error('Error validating session:', error);
    return false;
  }
}
