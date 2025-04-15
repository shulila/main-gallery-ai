
/**
 * Error handler for MainGallery.AI Chrome Extension
 */

import { logger } from './logger.js';

/**
 * Handle auth error and format a standardized response
 * @param {string} operation - The authentication operation that failed
 * @param {Error} error - The error object
 * @returns {Object} Standardized error response
 */
export function handleAuthError(operation, error) {
  logger.error(`Auth error in ${operation}:`, error);
  
  return {
    success: false,
    error: error instanceof Error ? error.message : String(error),
    operation
  };
}

/**
 * General error handler for extension operations
 * @param {string} context - The context where the error occurred
 * @param {Error} error - The error object
 * @param {Object} options - Additional options
 * @returns {Object} Error information and status
 */
export function handleError(context, error, options = {}) {
  const { silent = false, returnValue = null } = options;
  
  if (!silent) {
    logger.error(`Error in ${context}:`, error);
  }
  
  return {
    error: error instanceof Error ? error.message : String(error),
    context,
    success: false,
    value: returnValue
  };
}
