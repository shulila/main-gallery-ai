
/**
 * Logger utility for MainGallery.AI Chrome Extension
 */

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Current log level - can be adjusted based on environment
const CURRENT_LOG_LEVEL = LOG_LEVELS.INFO;

// Get timestamp for logs
function getTimestamp() {
  return new Date().toISOString();
}

// Format log message
function formatLogMessage(level, message, data) {
  const timestamp = getTimestamp();
  let formattedMessage = `[MainGallery] [${timestamp}] [${level}] ${message}`;
  
  if (data !== undefined) {
    try {
      if (typeof data === 'object') {
        formattedMessage += ` ${JSON.stringify(data)}`;
      } else {
        formattedMessage += ` ${data}`;
      }
    } catch (error) {
      formattedMessage += ` [Error stringifying data: ${error.message}]`;
    }
  }
  
  return formattedMessage;
}

// Logger object
export const logger = {
  error: function(message, data) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.ERROR) {
      console.error(formatLogMessage('ERROR', message, data));
    }
  },
  
  warn: function(message, data) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.WARN) {
      console.warn(formatLogMessage('WARN', message, data));
    }
  },
  
  log: function(message, data) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.INFO) {
      console.log(formatLogMessage('INFO', message, data));
    }
  },
  
  debug: function(message, data) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
      console.log(formatLogMessage('DEBUG', message, data));
    }
  }
};
