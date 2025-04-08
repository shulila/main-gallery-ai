
/**
 * Error handling utilities for the extension
 */
import { logger } from './logger.js';

/**
 * Handles errors in a consistent way
 * @param {string} source - Source of the error
 * @param {Error|any} error - Error object or message
 * @param {object} options - Additional options
 * @returns {void}
 */
export function handleError(source, error, options = {}) {
  const { silent = false, rethrow = false, details = {} } = options;
  
  if (!silent) {
    try {
      // If error is an object, format it for better readability
      let errorOutput;
      if (error instanceof Error) {
        errorOutput = {
          name: error.name,
          message: error.message,
          stack: error.stack
        };
      } else if (typeof error === 'object' && error !== null) {
        // Format object errors (like API responses) more clearly
        try {
          errorOutput = JSON.stringify(error);
        } catch (e) {
          errorOutput = Object.keys(error).reduce((acc, key) => {
            acc[key] = String(error[key]);
            return acc;
          }, {});
        }
      } else {
        errorOutput = String(error);
      }
      
      logger.error(`ERROR in ${source}:`, errorOutput, details);
    } catch (loggingError) {
      // Fallback in case of issues with error serialization
      logger.error(`ERROR in ${source} (logging failed):`, String(error), String(loggingError));
    }
  }
  
  if (rethrow) {
    throw error;
  }
}

/**
 * Execute a function with retry mechanism
 * @param {Function} fn - Function to retry
 * @param {object} options - Options for retrying
 * @returns {Promise<any>} - Result of the function
 */
export async function withRetry(fn, options = {}) {
  const { 
    maxRetries = 2, 
    baseDelay = 500, 
    shouldRetry = () => true,
    source = 'unknown'
  } = options;
  
  let retries = 0;
  let lastError;
  
  while (retries <= maxRetries) {
    try {
      if (retries > 0) {
        const delay = baseDelay * Math.pow(1.5, retries - 1);
        logger.warn(`Retry ${retries}/${maxRetries} for ${source} in ${delay}ms: ${lastError?.message || 'Unknown error'}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      return await fn();
    } catch (error) {
      lastError = error;
      retries++;
      
      if (retries > maxRetries || !shouldRetry(error)) {
        break;
      }
    }
  }
  
  logger.error(`Max retries (${maxRetries}) reached for ${source}:`, lastError?.message);
  throw lastError;
}

/**
 * Safe fetch utility with built-in error handling and JSON parsing
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @returns {Promise<any>} - Parsed JSON response
 */
export async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    
    // Check content type to avoid parsing HTML as JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      const text = await response.text();
      // Check if it looks like JSON anyway
      if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
        try {
          return JSON.parse(text);
        } catch (e) {
          logger.error("ERROR: Received text that appears to be JSON but failed to parse:", text.substring(0, 100) + "...");
          throw new Error("ERROR in safeFetch: Received HTML response when expecting JSON");
        }
      } else {
        logger.error("ERROR: Received HTML response instead of JSON:", text.substring(0, 100) + "...");
        throw new Error("ERROR in safeFetch: Received HTML response when expecting JSON");
      }
    }
  } catch (error) {
    // Enhance with fetch context
    error.fetchUrl = url;
    error.fetchOptions = { ...options, headers: { ...options.headers } };
    // Remove authorization headers from logs
    if (error.fetchOptions?.headers?.Authorization) {
      error.fetchOptions.headers.Authorization = '[REDACTED]';
    }
    
    handleError('safeFetch', error);
    throw error;
  }
}

/**
 * Convert any error to a standardized format
 * @param {Error|string|any} error - Error to format
 * @returns {object} - Standardized error object
 */
export function formatError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: Date.now()
    };
  } else if (typeof error === 'string') {
    return {
      name: 'Error',
      message: error,
      timestamp: Date.now()
    };
  } else if (typeof error === 'object' && error !== null) {
    return {
      ...error,
      timestamp: Date.now()
    };
  } else {
    return {
      name: 'Unknown',
      message: String(error),
      timestamp: Date.now()
    };
  }
}
