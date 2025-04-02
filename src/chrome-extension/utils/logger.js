
/**
 * Centralized logging utility for MainGallery.AI
 * Provides consistent logging with environment awareness
 */

const PREFIX = '[MainGallery]';

/**
 * Determine if we're in development mode
 * @returns {boolean} True if in development mode
 */
function isDevelopment() {
  // In browser extension context there's no NODE_ENV, so we use a debug flag
  // This could be configured via storage.sync in a more advanced implementation
  return false; // Default to production behavior for safety
}

/**
 * Log utility with severity levels and consistent formatting
 */
export const logger = {
  debug: (message, data = null) => {
    if (isDevelopment()) {
      if (data) {
        console.debug(`${PREFIX} DEBUG:`, message, data);
      } else {
        console.debug(`${PREFIX} DEBUG:`, message);
      }
    }
  },
  
  log: (message, data = null) => {
    if (data) {
      console.log(`${PREFIX}`, message, data);
    } else {
      console.log(`${PREFIX}`, message);
    }
  },
  
  info: (message, data = null) => {
    if (data) {
      console.info(`${PREFIX} INFO:`, message, data);
    } else {
      console.info(`${PREFIX} INFO:`, message);
    }
  },
  
  warn: (message, data = null) => {
    if (data) {
      console.warn(`${PREFIX} WARNING:`, message, data);
    } else {
      console.warn(`${PREFIX} WARNING:`, message);
    }
  },
  
  error: (message, error = null) => {
    if (error) {
      console.error(`${PREFIX} ERROR:`, message, error);
    } else {
      console.error(`${PREFIX} ERROR:`, message);
    }
  }
};
