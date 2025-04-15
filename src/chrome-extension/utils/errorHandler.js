
/**
 * Error handler for MainGallery.AI Chrome Extension
 */

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
 * @param {string} operation - The operation that failed
 * @param {Error|any} error - The error that occurred
 * @returns {Object} Error response object
 */
export function handleAuthError(operation, error) {
  // Log the error with context
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
