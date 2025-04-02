
/**
 * Centralized error handling for MainGallery.AI
 * Provides consistent error handling and reporting
 */

import { logger } from './logger.js';

/**
 * Handle errors consistently across the application
 * @param {string} context - Where the error occurred
 * @param {Error|string} error - The error object or message
 * @param {Object} [options] - Additional options
 * @param {boolean} [options.silent=false] - Whether to suppress console output
 * @param {boolean} [options.rethrow=false] - Whether to rethrow the error after handling
 * @param {Function} [options.callback] - Optional callback to execute after handling
 */
export function handleError(context, error, options = {}) {
  const { silent = false, rethrow = false, callback = null } = options;
  
  // Extract error details
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : new Error().stack;
  
  if (!silent) {
    logger.error(`Error in ${context}: ${errorMessage}`, { stack: errorStack });
  }
  
  // Here we could add integration with external error monitoring services
  // Example: Sentry.captureException(error, { tags: { context } });
  
  // Execute callback if provided
  if (callback && typeof callback === 'function') {
    try {
      callback(error);
    } catch (callbackError) {
      logger.error('Error in error handler callback', callbackError);
    }
  }
  
  // Rethrow if specified
  if (rethrow) {
    throw error;
  }
}

/**
 * Creates a safe function wrapper that catches errors and handles them
 * @param {Function} fn - The function to wrap
 * @param {string} context - Context for error reporting
 * @param {Object} [options] - Error handling options
 * @returns {Function} Wrapped function that handles its own errors
 */
export function createSafeFunction(fn, context, options = {}) {
  return function safeFunctionWrapper(...args) {
    try {
      const result = fn.apply(this, args);
      
      // Handle promises
      if (result instanceof Promise) {
        return result.catch(error => {
          handleError(context, error, options);
          if (options.defaultValue !== undefined) {
            return options.defaultValue;
          }
          throw error;
        });
      }
      
      return result;
    } catch (error) {
      handleError(context, error, options);
      if (options.defaultValue !== undefined) {
        return options.defaultValue;
      }
      if (options.rethrow !== false) {
        throw error;
      }
      return undefined;
    }
  };
}
