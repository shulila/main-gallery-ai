
/**
 * Error handler for MainGallery.AI Chrome Extension
 */

import { logger } from './logger.js';

/**
 * Handle authentication errors
 * @param {string} operation - The operation that failed
 * @param {Error|any} error - The error that occurred
 * @returns {Object} Error response object
 */
export function handleAuthError(operation, error) {
  logger.error(`Error in ${operation}:`, error);
  
  // Format the error message
  let errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
  
  // Categorize common errors for better user feedback
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    errorMessage = 'Network error. Please check your internet connection.';
  } else if (errorMessage.includes('token') && errorMessage.includes('expire')) {
    errorMessage = 'Your session has expired. Please sign in again.';
  } else if (errorMessage.includes('permission') || errorMessage.includes('access')) {
    errorMessage = 'Permission denied. Please check your account permissions.';
  }
  
  return {
    success: false,
    error: errorMessage,
    operation
  };
}

/**
 * Handle general errors
 * @param {string} context - Error context
 * @param {Error|any} error - The error that occurred
 * @returns {string} Formatted error message
 */
export function formatError(context, error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return `[${context}] ${errorMessage}`;
}
