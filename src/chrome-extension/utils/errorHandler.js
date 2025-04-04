
/**
 * Centralized error handling for MainGallery.AI
 * Provides consistent error handling and reporting with improved API error detection
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
    logger.error(`Error in ${context}: ${errorMessage}`, { stack: errorStack, originalError: error });
  }
  
  // Check if this is an API response error
  if (error && error.response) {
    try {
      // Log additional details about the API error
      const responseContentType = error.response.headers?.get('content-type') || 'unknown';
      const isHtml = responseContentType.includes('text/html') || 
                     (error.isHtmlError === true);
      
      logger.error('API Response Error Details', { 
        status: error.response.status,
        statusText: error.response.statusText,
        contentType: responseContentType,
        isHtml: isHtml
      });
      
      // If the error is HTML instead of JSON, log this specific issue
      if (isHtml) {
        logger.error('Received HTML response instead of JSON', {
          url: error.response.url || 'Unknown URL',
          method: error.response.method || 'Unknown Method'
        });
        
        // Set a specific flag for better handling by callers
        error.isHtmlError = true;
      }
    } catch (detailsError) {
      // If we can't extract error details, log that too
      if (!silent) {
        logger.error('Could not extract API error details', detailsError);
      }
    }
  }
  
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

/**
 * Helper function to check if a response is HTML instead of expected JSON
 * @param {Response} response - Fetch API Response object
 * @returns {Promise<boolean>} True if response appears to be HTML
 */
export async function isHtmlResponse(response) {
  try {
    const contentType = response.headers.get('content-type') || '';
    
    // Quick check based on content-type
    if (contentType.includes('text/html')) {
      return true;
    }
    
    // If content-type check is inconclusive, try to peek at the content
    if (!contentType.includes('application/json')) {
      const clone = response.clone();
      const text = await clone.text();
      return text.includes('<!DOCTYPE html>') || 
             text.includes('<html') ||
             text.includes('<body');
    }
    
    return false;
  } catch (error) {
    logger.error('Error checking if response is HTML', error);
    return false;
  }
}

/**
 * Enhanced fetch wrapper that handles common API errors
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @returns {Promise<object>} - Parsed JSON response
 */
export async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);
    
    // Check if the response is OK (status in the range 200-299)
    if (!response.ok) {
      // Check if this is an HTML response when JSON was expected
      const isHtml = await isHtmlResponse(response);
      
      // Create a custom error object with the response attached
      const error = new Error(
        isHtml 
          ? "Received HTML response instead of JSON" 
          : `HTTP error ${response.status}: ${response.statusText}`
      );
      
      error.response = response;
      
      if (isHtml) {
        error.isHtmlError = true;
      }
      
      throw error;
    }
    
    // Validate and parse JSON
    try {
      // Check content type
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        // Peek at the response to determine if it's HTML
        const isHtml = await isHtmlResponse(response);
        if (isHtml) {
          const error = new Error("Received HTML response instead of JSON");
          error.response = response;
          error.isHtmlError = true;
          throw error;
        }
        
        logger.warn('Response content-type is not JSON:', contentType);
      }
      
      // Attempt to parse JSON
      const data = await response.json();
      return data;
    } catch (parseError) {
      // Handle JSON parse errors or HTML response errors
      const error = new Error("Invalid response format or failed to parse JSON");
      error.response = response;
      error.originalError = parseError;
      
      // Check if it's an HTML response
      if (parseError.isHtmlError) {
        error.isHtmlError = true;
      } else {
        // Try to determine if the response is HTML
        try {
          const clone = response.clone();
          const text = await clone.text();
          const htmlResponse = text.includes('<!DOCTYPE html>') || 
                              text.includes('<html') ||
                              text.includes('<body');
          
          if (htmlResponse) {
            error.isHtmlError = true;
            error.rawData = text.substring(0, 500); // First 500 chars for debugging
          }
        } catch (textError) {
          logger.error('Failed to read response text:', textError);
        }
      }
      
      throw error;
    }
  } catch (error) {
    // Enhance the error with more context
    error.url = url;
    error.fetchOptions = { ...options };
    
    // Remove sensitive data from logs
    if (error.fetchOptions.headers) {
      const safeHeaders = { ...error.fetchOptions.headers };
      if (safeHeaders.Authorization) {
        safeHeaders.Authorization = "[REDACTED]";
      }
      error.fetchOptions.headers = safeHeaders;
    }
    
    // Redact sensitive body content
    if (error.fetchOptions.body && typeof error.fetchOptions.body === 'string') {
      if (error.fetchOptions.body.includes('password') || 
          error.fetchOptions.body.includes('token')) {
        error.fetchOptions.body = "[REDACTED]";
      }
    }
    
    // Throw the enhanced error
    throw error;
  }
}

// Export utility functions
export const errorUtils = {
  handleError,
  createSafeFunction,
  isHtmlResponse,
  safeFetch
};
