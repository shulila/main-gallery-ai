
/**
 * Error handler for MainGallery.AI Chrome Extension
 */

import { logger } from './logger.js';

/**
 * Error types enum
 */
export const ErrorTypes = {
  NETWORK: 'network',
  AUTH: 'auth',
  RESOURCE: 'resource',
  VALIDATION: 'validation',
  PERMISSION: 'permission',
  STORAGE: 'storage',
  UNKNOWN: 'unknown'
};

/**
 * Handle error and return standardized error response
 * @param {string} operation - Operation that failed
 * @param {Error} error - Error object
 * @param {Object} [options={}] - Additional options
 * @param {boolean} [options.silent=false] - Whether to suppress logging
 * @param {string} [options.type=ErrorTypes.UNKNOWN] - Error type for categorization
 * @param {any} [options.returnValue=null] - Value to return in error case
 * @returns {Object} Standardized error response
 */
export function handleError(operation, error, options = {}) {
  const { silent = false, type = ErrorTypes.UNKNOWN, returnValue = null } = options;
  
  // Create standardized error response
  const errorResponse = {
    success: false,
    operation,
    error: {
      message: error?.message || String(error) || 'An unknown error occurred',
      code: error?.code || type.toUpperCase(),
      type
    },
    value: returnValue
  };
  
  // Add context specific info based on error type
  switch (type) {
    case ErrorTypes.NETWORK:
      errorResponse.error.statusCode = error?.statusCode || error?.status;
      errorResponse.error.url = error?.url;
      break;
    case ErrorTypes.AUTH:
      errorResponse.requiresAuth = true;
      break;
    case ErrorTypes.RESOURCE:
      errorResponse.error.resourcePath = error?.path || error?.resourcePath;
      break;
    // Additional type-specific handling can be added here
  }
  
  // Add stack trace in development mode
  if (process.env.NODE_ENV === 'development' || error?.includeStack) {
    errorResponse.error.stack = error?.stack;
  }
  
  // Log the error unless silent is true
  if (!silent) {
    logger.error(`Error in ${operation} [${type}]:`, error);
  }
  
  return errorResponse;
}

/**
 * Wrap a function with error handling
 * @param {Function} fn - Function to wrap
 * @param {string} operation - Operation name for error context
 * @param {Object} [options={}] - Error handling options
 * @returns {Function} Wrapped function with error handling
 */
export function withErrorHandling(fn, operation, options = {}) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      return handleError(operation, error, options);
    }
  };
}

/**
 * Create error object with code
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {string} [type=ErrorTypes.UNKNOWN] - Error type
 * @returns {Error} Error object with code
 */
export function createError(message, code, type = ErrorTypes.UNKNOWN) {
  const error = new Error(message);
  error.code = code;
  error.type = type;
  return error;
}

/**
 * Handle Chrome runtime last error
 * @param {string} operation - Operation that might have failed
 * @returns {Error|null} Error object if there was an error, null otherwise
 */
export function handleChromeError(operation) {
  if (chrome.runtime.lastError) {
    const error = new Error(chrome.runtime.lastError.message);
    error.code = 'CHROME_ERROR';
    error.type = ErrorTypes.UNKNOWN;
    
    logger.error(`Chrome error in ${operation}:`, error);
    return error;
  }
  return null;
}

/**
 * Safe Promise wrapper for Chrome API callbacks
 * @param {Function} chromeApiFunction - Chrome API function to call
 * @param {Array} args - Arguments to pass to the function
 * @returns {Promise} Promise resolving to the callback result
 */
export function chromePromise(chromeApiFunction, ...args) {
  return new Promise((resolve, reject) => {
    try {
      chromeApiFunction(...args, (...results) => {
        const error = handleChromeError(chromeApiFunction.name);
        if (error) {
          reject(error);
        } else {
          resolve(results.length === 1 ? results[0] : results);
        }
      });
    } catch (error) {
      reject(createError(`Error calling Chrome API: ${error.message}`, 'CHROME_API_ERROR'));
    }
  });
}
