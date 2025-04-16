
/**
 * Client ID validation utility for OAuth2
 */

import { logger } from '../logger.js';

/**
 * Validates Google OAuth client ID format
 * @param {string} clientId - The client ID to validate
 * @returns {boolean} Whether the client ID is valid
 */
export function validateClientId(clientId) {
  if (!clientId) {
    logger.error('Client ID is missing');
    return false;
  }
  
  if (typeof clientId !== 'string') {
    logger.error('Client ID is not a string:', typeof clientId);
    return false;
  }
  
  // Google client IDs should end with .apps.googleusercontent.com
  if (!clientId.includes('.apps.googleusercontent.com')) {
    logger.error('Invalid client ID format:', clientId);
    return false;
  }
  
  return true;
}
