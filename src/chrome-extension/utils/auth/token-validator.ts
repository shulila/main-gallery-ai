
import { logger } from '../logger.js';
import { GOOGLE_CLIENT_ID } from '../oauth-config.js';

export interface TokenValidationResult {
  valid: boolean;
  reason?: string;
  details?: Record<string, any>;
}

/**
 * Validate a Google OAuth token
 */
export async function validateGoogleToken(token: string): Promise<TokenValidationResult> {
  try {
    if (!token) {
      return { valid: false, reason: 'Token is empty' };
    }
    
    // Verify token with Google
    const response = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`);
    
    if (!response.ok) {
      return { 
        valid: false, 
        reason: `Token validation failed with status: ${response.status}`,
        details: { status: response.status, statusText: response.statusText }
      };
    }
    
    const data = await response.json();
    
    // Check if token is for the correct client
    if (data.aud && GOOGLE_CLIENT_ID && data.aud !== GOOGLE_CLIENT_ID) {
      return { 
        valid: false, 
        reason: 'Token is for a different client',
        details: { expected: GOOGLE_CLIENT_ID, actual: data.aud }
      };
    }
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (data.exp && data.exp < now) {
      return { 
        valid: false, 
        reason: 'Token is expired',
        details: { expiresAt: data.exp, now }
      };
    }
    
    return { valid: true, details: { sub: data.sub, email: data.email } };
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
 */
export async function validateSession(session: any): Promise<boolean> {
  if (!session) return false;
  
  // Check if session has required fields
  if (!session.access_token) return false;
  
  // Check if session is expired
  if (session.expires_at) {
    const expiryDate = new Date(session.expires_at);
    if (expiryDate < new Date()) return false;
  }
  
  // For Google sessions, validate the token
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
