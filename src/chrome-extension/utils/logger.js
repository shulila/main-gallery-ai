
/**
 * Simple logger for the MainGallery.AI extension
 * Centralizes logging with consistent formatting and level control
 */

// Log levels
export const LOG_LEVELS = {
  DEBUG: 0,
  LOG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4
};

// Current log level (can be changed at runtime)
let currentLogLevel = LOG_LEVELS.LOG;

// Prefix for all log messages
const LOG_PREFIX = '[MainGallery]';

/**
 * Set the current log level
 * @param {number} level - Log level to set
 */
function setLogLevel(level) {
  if (Object.values(LOG_LEVELS).includes(level)) {
    currentLogLevel = level;
    log(`Log level set to ${Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level)}`);
  } else {
    error(`Invalid log level: ${level}`);
  }
}

/**
 * Log a debug message
 * @param {...any} args - Arguments to log
 */
function debug(...args) {
  if (currentLogLevel <= LOG_LEVELS.DEBUG) {
    console.debug(LOG_PREFIX, 'DEBUG:', ...args);
  }
}

/**
 * Log a regular message
 * @param {...any} args - Arguments to log
 */
function log(...args) {
  if (currentLogLevel <= LOG_LEVELS.LOG) {
    console.log(LOG_PREFIX, ...args);
  }
}

/**
 * Log an info message
 * @param {...any} args - Arguments to log
 */
function info(...args) {
  if (currentLogLevel <= LOG_LEVELS.INFO) {
    console.info(LOG_PREFIX, 'INFO:', ...args);
  }
}

/**
 * Log a warning message
 * @param {...any} args - Arguments to log
 */
function warn(...args) {
  if (currentLogLevel <= LOG_LEVELS.WARN) {
    console.warn(LOG_PREFIX, 'WARNING:', ...args);
  }
}

/**
 * Log an error message
 * @param {...any} args - Arguments to log
 */
function error(...args) {
  if (currentLogLevel <= LOG_LEVELS.ERROR) {
    console.error(LOG_PREFIX, 'ERROR:', ...args);
  }
}

/**
 * Create a timestamped log message 
 * Useful for tracking timing issues in authentication flow
 * @param {string} message - Message to log
 * @param {any} data - Optional data to include
 */
function time(message, data) {
  const timestamp = new Date().toISOString();
  if (data) {
    log(`[${timestamp}] ${message}`, data);
  } else {
    log(`[${timestamp}] ${message}`);
  }
}

// Export the logger functions
export const logger = {
  setLogLevel,
  debug,
  log,
  info,
  warn,
  error,
  time,
  LOG_LEVELS
};

// Export default for compatibility
export default logger;
