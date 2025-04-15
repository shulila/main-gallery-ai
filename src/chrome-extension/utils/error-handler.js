
/**
 * Error handler for MainGallery.AI Chrome Extension
 */

import { logger } from './logger.js';

/**
 * Handle error and return standardized error response
 * @param {string} operation - Operation that failed
 * @param {Error} error - Error object
 * @returns {Object} Standardized error response
 */
export function handleError(operation, error) {
  // Log the error
  logger.error(`Error in ${operation}:`, error);
  
  // Create standardized error response
  const errorResponse = {
    success: false,
    operation,
    error: {
      message: error.message || 'An unknown error occurred',
      code: error.code || 'UNKNOWN_ERROR'
    }
  };
  
  // Add stack trace in debug mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = error.stack;
  }
  
  // Special handling for authentication errors
  if (operation.includes('auth') || operation.includes('sign')) {
    errorResponse.requiresAuth = true;
  }
  
  return errorResponse;
}

/**
 * Create error object with code
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @returns {Error} Error object with code
 */
export function createError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}
