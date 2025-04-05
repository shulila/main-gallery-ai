
/**
 * Centralized error handling for MainGallery.AI
 * Provides consistent error handling and reporting with improved API error detection
 */

// Import logger in a way that works with ES modules
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
    // Add retry capabilities
    const maxRetries = options.maxRetries || 2;
    let retries = 0;
    let lastError = null;
    
    while (retries <= maxRetries) {
      try {
        if (retries > 0) {
          logger.warn(`Retry attempt ${retries} for ${url}`);
          // Add exponential backoff
          await new Promise(r => setTimeout(r, 500 * Math.pow(2, retries-1)));
        }
        
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
            
            // Log more details about HTML errors
            const clone = response.clone();
            const text = await clone.text();
            const preview = text.substring(0, 200) + '...'; // First 200 chars
            
            logger.error('HTML Error Response Preview:', {
              url: url,
              status: response.status,
              preview: preview,
              contentType: response.headers.get('content-type')
            });
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
              
              // Log more detailed error for HTML responses
              const clone = response.clone();
              const text = await clone.text();
              const preview = text.substring(0, 200) + '...'; // First 200 chars
              
              logger.error('Received HTML when expecting JSON:', {
                url: url,
                contentType: contentType,
                preview: preview
              });
              
              throw error;
            }
            
            logger.warn('Response content-type is not JSON:', contentType);
          }
          
          // Attempt to parse JSON
          const data = await response.json();
          return data;
        } catch (parseError) {
          // Check if we have an HTML error already identified
          if (parseError.isHtmlError) {
            throw parseError;
          }
          
          // Try to determine if the response is HTML
          const clone = response.clone();
          try {
            const text = await clone.text();
            const htmlResponse = text.includes('<!DOCTYPE html>') || 
                                text.includes('<html') ||
                                text.includes('<body');
            
            const error = new Error("Invalid response format or failed to parse JSON");
            error.response = response;
            error.originalError = parseError;
            
            if (htmlResponse) {
              error.isHtmlError = true;
              error.rawData = text.substring(0, 500); // First 500 chars for debugging
              
              logger.error('Failed to parse JSON - received HTML:', {
                url: url,
                preview: text.substring(0, 200) + '...',
                method: options.method || 'GET'
              });
            }
            
            throw error;
          } catch (textError) {
            // If we can't even read the response as text, throw the original parse error
            logger.error('Failed to read response text:', textError);
            throw parseError;
          }
        }
      } catch (error) {
        lastError = error;
        
        // Only retry on network errors or 5xx server errors
        const shouldRetry = (
          !error.response || // Network error
          (error.response && error.response.status >= 500) // Server error
        ) && retries < maxRetries;
        
        if (!shouldRetry) {
          // Don't retry, break out of the loop
          break;
        }
        
        retries++;
      }
    }
    
    // If we got here, all retries failed
    throw lastError || new Error(`Failed to fetch ${url} after ${maxRetries} retries`);
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
    
    // Remove maxRetries as it's not a standard fetch option
    delete error.fetchOptions.maxRetries;
    
    // Throw the enhanced error
    throw error;
  }
}

// Export utility functions
export const errorUtils = {
  handleError,
  isHtmlResponse,
  safeFetch
};
