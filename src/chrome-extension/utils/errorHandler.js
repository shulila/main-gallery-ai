
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
          errorOutput = JSON.stringify(error, null, 2);
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
 * Safe fetch utility with improved error handling and JSON parsing
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @returns {Promise<any>} - Parsed JSON response
 */
export async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorDetail;
      
      try {
        // Try to parse as JSON if possible
        errorDetail = JSON.parse(errorText);
      } catch (e) {
        // If not JSON, use the first 200 chars of text
        errorDetail = errorText.substring(0, 200) + (errorText.length > 200 ? '...' : '');
      }
      
      const error = new Error(`HTTP error ${response.status}: ${response.statusText}`);
      error.status = response.status;
      error.statusText = response.statusText;
      error.responseText = errorDetail;
      throw error;
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
          logger.error("ERROR: Received text that appears to be JSON but failed to parse:", text.substring(0, 200) + "...");
          const error = new Error("ERROR in safeFetch: Received invalid JSON response");
          error.responseText = text.substring(0, 500);
          error.parseError = e.message;
          throw error;
        }
      } else {
        logger.error("ERROR: Received HTML response instead of JSON:", text.substring(0, 200) + "...");
        const error = new Error("ERROR in safeFetch: Received HTML response when expecting JSON");
        error.responseText = text.substring(0, 500);
        throw error;
      }
    }
  } catch (error) {
    // Enhance with fetch context
    error.fetchUrl = url;
    error.fetchOptions = { ...options };
    // Remove authorization headers from logs
    if (error.fetchOptions?.headers?.Authorization) {
      error.fetchOptions.headers = { ...error.fetchOptions.headers };
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

/**
 * Check if a tab exists and content script is loaded
 * @param {number} tabId - The tab ID to check
 * @returns {Promise<boolean>} - Whether the tab exists and content script is ready
 */
export async function isTabAvailable(tabId) {
  try {
    // First check if tab exists
    const tabs = await chrome.tabs.query({});
    const tabExists = tabs.some(tab => tab.id === tabId);
    
    if (!tabExists) {
      return false;
    }

    // Then check if we can ping the content script
    return new Promise(resolve => {
      try {
        chrome.tabs.sendMessage(
          tabId, 
          { type: "PING" },
          response => {
            if (chrome.runtime.lastError) {
              resolve(false);
            } else {
              resolve(true);
            }
          }
        );
        
        // Set a timeout in case the message never returns
        setTimeout(() => resolve(false), 300);
      } catch (e) {
        resolve(false);
      }
    });
  } catch (e) {
    return false;
  }
}

/**
 * Safe wrapper for sending messages to tabs with validation
 * @param {number} tabId - Tab ID to send message to
 * @param {object} message - Message to send
 * @param {object} options - Options for sending
 * @returns {Promise<any>} - Response from the tab
 */
export async function sendTabMessageSafely(tabId, message, options = {}) {
  const { 
    retries = 2, 
    checkTab = true, 
    timeout = 5000 
  } = options;
  
  // First check if tab exists and content script is loaded
  if (checkTab) {
    const isAvailable = await isTabAvailable(tabId);
    if (!isAvailable) {
      throw new Error(`Tab ${tabId} is not available or content script not loaded`);
    }
  }
  
  // Use promise with timeout for better error handling
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout sending message to tab ${tabId}`));
    }, timeout);
    
    try {
      chrome.tabs.sendMessage(tabId, message, response => {
        clearTimeout(timeoutId);
        
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}
