
/**
 * MainGallery.AI Structured Logging Module
 * Provides consistent logging across the extension
 */

// Log levels
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
 * Log an error message
 * @param {string} message - The message to log
 * @param {Error|object} [error] - Optional error object
 */
function error(message, error) {
  if (currentLogLevel >= LOG_LEVELS.ERROR) {
    console.error(`${LOG_PREFIX} ERROR: ${message}`, error || '');
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

// Export all functions
export const logger = {
  setLogLevel,
  getLogLevel,
  error,
  warn,
  info,
  debug,
  log,
  LOG_LEVELS
};
