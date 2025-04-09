
import { logger } from './logger.js';

/**
 * Handles errors with consistent logging and optional callbacks
 * @param {string} source - Where the error occurred
 * @param {Error} error - The error object
 * @param {Object} options - Additional options
 * @param {boolean} [options.silent=false] - Whether to suppress console output
 * @param {Function} [options.callback] - Optional callback to run after error handling
 */
export function handleError(source, error, options = {}) {
  const { silent = false, callback } = options;
  
  // Format the error for logging
  const errorMessage = error?.message || String(error);
  const errorStack = error?.stack || 'No stack trace available';
  
  // Log the error unless silent mode is on
  if (!silent) {
    logger.error(`Error in ${source}: ${errorMessage}`);
    logger.error(`Stack trace: ${errorStack}`);
  }
  
  // Run callback if provided
  if (typeof callback === 'function') {
    try {
      callback(error);
    } catch (callbackError) {
      logger.error(`Error in error handler callback: ${callbackError?.message}`);
    }
  }
  
  // Return the error for further processing
  return error;
}

/**
 * Enhanced fetch with retry capability and better error handling
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} [options.maxRetries=1] - Maximum number of retries
 * @param {number} [options.retryDelay=500] - Delay between retries in ms
 * @returns {Promise<Response>} - Fetch response
 */
export async function safeFetch(url, options = {}) {
  const { maxRetries = 1, retryDelay = 500, ...fetchOptions } = options;
  
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Add timeout if not already specified
      if (!fetchOptions.signal) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        fetchOptions.signal = controller.signal;
        
        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
        
        return response;
      } else {
        const response = await fetch(url, fetchOptions);
        
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
        
        return response;
      }
    } catch (error) {
      lastError = error;
      
      // Log retry attempts (except for the last one)
      if (attempt < maxRetries) {
        logger.warn(`Fetch attempt ${attempt + 1}/${maxRetries + 1} failed: ${error.message}`);
        logger.warn(`Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  // If we get here, all attempts failed
  throw lastError;
}
