
/**
 * Error handling utilities for MainGallery.AI Chrome Extension
 */
import { logger } from './logger.js';

/**
 * Standard error handler that formats and logs errors
 * @param {string} source - Source function/component where error occurred
 * @param {Error|Object|string} error - Error object, message or data
 * @param {Object} options - Additional options
 * @returns {Object} Formatted error object
 */
export function handleError(source, error, options = {}) {
  const { silent = false, logLevel = 'error' } = options;
  
  // Create a standardized error object with detailed info
  const errorDetails = {
    source: source,
    timestamp: Date.now(),
    message: error?.message || (typeof error === 'string' ? error : 'Unknown error')
  };
  
  // Add status code if available
  if (error?.status) {
    errorDetails.status = error.status;
  }
  
  // Add response info if available
  if (error?.response) {
    errorDetails.response = {
      status: error.response.status,
      statusText: error.response.statusText,
      url: error.response.url
    };
    
    // Try to extract response data
    try {
      if (error.response.json) {
        error.response.json().then(data => {
          errorDetails.responseData = data;
          logger.error(`${source} error response data:`, data);
        }).catch(() => {});
      }
    } catch (e) {
      // Ignore error in error handling
    }
  }
  
  // Add stack trace if available
  if (error?.stack) {
    errorDetails.stack = error.stack;
  }
  
  // Log the error unless silent is true
  if (!silent) {
    if (logLevel === 'warn') {
      logger.warn(`ERROR in ${source}:`, errorDetails.message, error);
    } else {
      logger.error(`ERROR in ${source}:`, errorDetails.message, error);
    }
  }
  
  return errorDetails;
}

/**
 * Safe fetch utility that handles errors consistently
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise} Response data
 */
export async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);
    
    // Check if response is HTML when expecting JSON
    const contentType = response.headers.get('content-type');
    const isHtml = contentType?.includes('text/html') || 
                  (response.isHtmlError === true);
    
    if (isHtml) {
      logger.error(`ERROR: Received HTML response instead of JSON`);
      throw new Error('Received HTML response when expecting JSON');
    }
    
    // Check for HTTP errors
    if (!response.ok) {
      const error = new Error(`HTTP error ${response.status}: ${response.statusText}`);
      error.status = response.status;
      error.statusText = response.statusText;
      error.response = response;
      throw error;
    }
    
    // Parse JSON response
    try {
      const data = await response.json();
      return data;
    } catch (e) {
      const error = new Error('Invalid JSON response');
      error.originalError = e;
      error.response = response;
      throw error;
    }
  } catch (error) {
    handleError('safeFetch', error);
    throw error;
  }
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} Result of the function
 */
export async function withRetry(fn, options = {}) {
  const { 
    maxRetries = 3, 
    baseDelay = 300, 
    maxDelay = 3000,
    factor = 2,
    source = 'unknown'
  } = options;
  
  let attempt = 0;
  let lastError = null;
  
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      lastError = error;
      
      if (attempt >= maxRetries) {
        // Log and throw last error if max retries reached
        logger.error(`Max retries (${maxRetries}) reached for ${source}`);
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(factor, attempt), maxDelay);
      
      // Log retry attempt
      logger.warn(`Retry ${attempt}/${maxRetries} for ${source} in ${delay}ms:`, error.message);
      
      // Wait before next retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // If we get here, all retries failed
  handleError(`withRetry(${source})`, lastError || new Error('All retries failed'));
  throw lastError || new Error(`All ${maxRetries} retries failed for ${source}`);
}
