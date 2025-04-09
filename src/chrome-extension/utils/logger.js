
/**
 * Simple logger for the MainGallery.AI extension
 * Centralizes logging with consistent formatting and level control
 */

// Set debug level
// 0 = errors only, 1 = warnings, 2 = info, 3 = debug, 4 = verbose
const LOG_LEVEL = 2;

// Format date for log entries
function getTimestamp() {
  return new Date().toISOString();
}

// Function to determine if a message should be logged based on level
function shouldLog(level) {
  const levelMap = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    verbose: 4
  };
  
  return levelMap[level] <= LOG_LEVEL;
}

// Wrap console methods with formatting and level control
export const logger = {
  error: (message, ...args) => {
    if (shouldLog('error')) {
      console.error(`[${getTimestamp()}] ERROR:`, message, ...args);
    }
  },
  
  warn: (message, ...args) => {
    if (shouldLog('warn')) {
      console.warn(`[${getTimestamp()}] WARN:`, message, ...args);
    }
  },
  
  info: (message, ...args) => {
    if (shouldLog('info')) {
      console.info(`[${getTimestamp()}] INFO:`, message, ...args);
    }
  },
  
  log: (message, ...args) => {
    if (shouldLog('info')) {
      console.log(`[${getTimestamp()}] INFO:`, message, ...args);
    }
  },
  
  debug: (message, ...args) => {
    if (shouldLog('debug')) {
      console.debug(`[${getTimestamp()}] DEBUG:`, message, ...args);
    }
  },
  
  verbose: (message, ...args) => {
    if (shouldLog('verbose')) {
      console.log(`[${getTimestamp()}] VERBOSE:`, message, ...args);
    }
  },
  
  // Allow setting log level dynamically
  setLevel: (level) => {
    if (typeof level === 'number' && level >= 0 && level <= 4) {
      LOG_LEVEL = level;
      console.log(`[${getTimestamp()}] Log level set to ${level}`);
    }
  }
};
