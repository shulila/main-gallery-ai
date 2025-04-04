
/**
 * MainGallery.AI Structured Logging Module
 * Provides consistent logging across the extension with improved error handling
 */

// Log levels with DEBUG as highest verbosity
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Current log level (can be adjusted via settings)
let currentLogLevel = LOG_LEVELS.INFO;

// Prefix for all logs
const LOG_PREFIX = '[MainGallery]';

/**
 * Set the current log level
 * @param {number} level - Log level constant from LOG_LEVELS
 */
function setLogLevel(level) {
  if (Object.values(LOG_LEVELS).includes(level)) {
    currentLogLevel = level;
  }
}

/**
 * Log an error message with improved error object handling
 * @param {string} message - The message to log
 * @param {Error|object|string} [error] - Optional error object or message
 */
function error(message, error) {
  if (currentLogLevel >= LOG_LEVELS.ERROR) {
    // Check if error is an object with response property (fetch API error)
    if (error && error.response) {
      try {
        const contentType = error.response.headers?.get('content-type') || 'unknown';
        const isHtml = contentType.includes('text/html') || 
                       (error.isHtmlError === true);
        
        if (isHtml) {
          console.error(`${LOG_PREFIX} ERROR: Received HTML response instead of JSON`);
        }
        
        console.error(`${LOG_PREFIX} ERROR: ${message}`, {
          status: error.response.status,
          statusText: error.response.statusText,
          responseType: contentType,
          isHtml: isHtml,
          error: error
        });
      } catch (e) {
        // Fallback if response processing fails
        console.error(`${LOG_PREFIX} ERROR: ${message}`, error);
      }
    } 
    // Handle regular Error objects
    else if (error instanceof Error) {
      console.error(`${LOG_PREFIX} ERROR: ${message}`, {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    } 
    // Handle plain string errors or other types
    else {
      console.error(`${LOG_PREFIX} ERROR: ${message}`, error || '');
    }
  }
}

/**
 * Log a warning message
 * @param {string} message - The message to log
 * @param {object} [data] - Optional data to include
 */
function warn(message, data) {
  if (currentLogLevel >= LOG_LEVELS.WARN) {
    console.warn(`${LOG_PREFIX} WARN: ${message}`, data || '');
  }
}

/**
 * Log an info message
 * @param {string} message - The message to log
 * @param {object} [data] - Optional data to include
 */
function info(message, data) {
  if (currentLogLevel >= LOG_LEVELS.INFO) {
    console.info(`${LOG_PREFIX} INFO: ${message}`, data || '');
  }
}

/**
 * Log a debug message
 * @param {string} message - The message to log
 * @param {object} [data] - Optional data to include
 */
function debug(message, data) {
  if (currentLogLevel >= LOG_LEVELS.DEBUG) {
    console.debug(`${LOG_PREFIX} DEBUG: ${message}`, data || '');
  }
}

/**
 * Simple log, equivalent to info level
 * @param {string} message - The message to log
 * @param {object} [data] - Optional data to include
 */
function log(message, data) {
  info(message, data);
}

/**
 * Get the current log level
 * @returns {number} Current log level
 */
function getLogLevel() {
  return currentLogLevel;
}

/**
 * Check if the response is valid JSON
 * This helps identify HTML responses incorrectly sent as JSON
 * @param {Response} response - Fetch API response object
 * @returns {Promise<{isJson: boolean, data: any, contentType: string}>}
 */
async function validateJsonResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  
  // Check if content type contains application/json
  const isJsonContentType = contentType.includes('application/json');
  
  try {
    // Try to parse as JSON regardless of content-type
    const text = await response.text();
    let data;
    
    try {
      data = JSON.parse(text);
      // Successfully parsed as JSON
      return { 
        isJson: true, 
        data, 
        contentType 
      };
    } catch (e) {
      // Not valid JSON, could be HTML or other format
      debug('Response is not valid JSON', { 
        contentType,
        textPreview: text.substring(0, 100) + '...',
        parseError: e.message
      });
      
      // Log a specific error for HTML responses
      if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
        error('Received HTML response instead of JSON', {
          contentType,
          textPreview: text.substring(0, 100) + '...'
        });
      }
      
      return { 
        isJson: false, 
        data: text, 
        contentType,
        htmlResponse: text.includes('<!DOCTYPE html>') || text.includes('<html')
      };
    }
  } catch (e) {
    error('Error reading response body', e);
    return { 
      isJson: false, 
      data: null, 
      contentType,
      error: e 
    };
  }
}

// Export all functions
export const logger = {
  setLogLevel,
  getLogLevel,
  error,
  warn,
  info,
  debug,
  log,
  LOG_LEVELS,
  validateJsonResponse
};
