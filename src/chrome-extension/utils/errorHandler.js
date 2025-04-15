
import { logger } from './logger.js';

/**
 * Safely handle fetch requests with error handling
 * @param {string|URL} url - URL to fetch
 * @param {RequestInit} [options] - Fetch options
 * @returns {Promise<Response>}
 */
export async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    logger.error('Fetch error:', error);
    throw error;
  }
}

/**
 * Handle auth errors consistently
 * @param {string} context - Where the error occurred
 * @param {Error|any} error - The error object
 * @returns {Object} Structured error response
 */
export function handleAuthError(context, error) {
  // Log the error with context
  logger.error(`Auth error in ${context}:`, error);
  
  // Categorize errors for better user feedback
  let userMessage = 'Authentication failed. Please try again.';
  
  if (error.message) {
    if (error.message.includes('canceled') || error.message.includes('cancel')) {
      userMessage = 'Authentication was canceled.';
    } else if (error.message.includes('network') || error.message.includes('connection')) {
      userMessage = 'Network error during authentication. Please check your connection.';
    } else if (error.message.includes('permission')) {
      userMessage = 'Permission denied. Please allow the required permissions.';
    } else if (error.message.includes('token') || error.message.includes('expired')) {
      userMessage = 'Authentication token is invalid or expired. Please sign in again.';
    }
  }
  
  // Return structured error object
  return {
    success: false,
    error: userMessage,
    technical_error: error.message || 'Unknown error',
    context: context
  };
}

/**
 * Generic error handler
 * @param {string} context - Where the error occurred
 * @param {Error|any} error - The error object
 * @returns {Object} Structured error response
 */
export function handleError(context, error) {
  logger.error(`Error in ${context}:`, error);
  
  // Return structured error for display to user
  if (error instanceof Error) {
    return {
      success: false,
      error: error.message || 'An error occurred',
      context
    };
  }
  
  return {
    success: false,
    error: 'An error occurred',
    context
  };
}

/**
 * Create an async function wrapper with timeout
 * @param {Function} asyncFn - Async function to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} errorMessage - Error message if timeout occurs
 * @returns {Function} Wrapped function with timeout
 */
export function withTimeout(asyncFn, timeoutMs = 10000, errorMessage = 'Operation timed out') {
  return async (...args) => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeoutMs);
      
      asyncFn(...args)
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(err => {
          clearTimeout(timeoutId);
          reject(err);
        });
    });
  };
}
