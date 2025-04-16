
/**
 * Logger module for MainGallery.AI Chrome Extension
 */

/**
 * Log levels
 */
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4  // Use to disable all logging
};

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  level: LOG_LEVELS.INFO,
  prefix: '[MainGallery]',
  enableTimestamp: true,
  storeLogsLocally: true,
  maxStoredLogs: 100,
  colors: {
    [LOG_LEVELS.DEBUG]: '#6c757d',  // Gray
    [LOG_LEVELS.INFO]: '#0d6efd',   // Blue
    [LOG_LEVELS.WARN]: '#ffc107',   // Yellow
    [LOG_LEVELS.ERROR]: '#dc3545'   // Red
  }
};

/**
 * Logger class with advanced features
 */
class Logger {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.storageKey = 'mg_logs';
  }

  /**
   * Get the current configuration
   * @returns {Object} Current logger configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update logger configuration
   * @param {Object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Set the log level
   * @param {number} level - New log level
   */
  setLevel(level) {
    this.config.level = level;
  }

  /**
   * Format a log message
   * @param {number} level - Log level
   * @param {string} message - Log message
   * @returns {string} Formatted log message
   * @private
   */
  _formatMessage(level, message) {
    const parts = [this.config.prefix];
    
    if (this.config.enableTimestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }
    
    parts.push(`[${this._getLevelName(level)}]`);
    parts.push(message);
    
    return parts.join(' ');
  }

  /**
   * Get the name of a log level
   * @param {number} level - Log level
   * @returns {string} Level name
   * @private
   */
  _getLevelName(level) {
    switch (level) {
      case LOG_LEVELS.DEBUG: return 'DEBUG';
      case LOG_LEVELS.INFO: return 'INFO';
      case LOG_LEVELS.WARN: return 'WARN';
      case LOG_LEVELS.ERROR: return 'ERROR';
      default: return 'UNKNOWN';
    }
  }

  /**
   * Write a log entry
   * @param {number} level - Log level
   * @param {string} message - Log message
   * @param {any} data - Additional data to log
   */
  log(level, message, data) {
    // Skip if logging is disabled for this level
    if (level < this.config.level) {
      return;
    }

    const formattedMessage = this._formatMessage(level, message);
    
    // Get the appropriate console method
    let consoleMethod;
    switch (level) {
      case LOG_LEVELS.DEBUG: consoleMethod = console.debug; break;
      case LOG_LEVELS.INFO: consoleMethod = console.info; break;
      case LOG_LEVELS.WARN: consoleMethod = console.warn; break;
      case LOG_LEVELS.ERROR: consoleMethod = console.error; break;
      default: consoleMethod = console.log;
    }
    
    // Apply color if available
    const color = this.config.colors[level];
    if (color) {
      if (data !== undefined) {
        consoleMethod(`%c${formattedMessage}`, `color: ${color}`, data);
      } else {
        consoleMethod(`%c${formattedMessage}`, `color: ${color}`);
      }
    } else {
      if (data !== undefined) {
        consoleMethod(formattedMessage, data);
      } else {
        consoleMethod(formattedMessage);
      }
    }
    
    // Store logs locally if enabled
    if (this.config.storeLogsLocally && level >= LOG_LEVELS.WARN) {
      this._storeLog(level, message, data);
    }
  }

  /**
   * Store a log entry locally
   * @param {number} level - Log level
   * @param {string} message - Log message
   * @param {any} data - Additional data
   * @private
   */
  _storeLog(level, message, data) {
    try {
      // Get existing logs
      const existingLogs = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      
      // Add new log
      existingLogs.push({
        level: this._getLevelName(level),
        timestamp: new Date().toISOString(),
        message,
        data: data ? JSON.stringify(data, this._safeStringify) : undefined
      });
      
      // Trim logs if necessary
      while (existingLogs.length > this.config.maxStoredLogs) {
        existingLogs.shift();
      }
      
      // Save logs
      localStorage.setItem(this.storageKey, JSON.stringify(existingLogs));
    } catch (error) {
      console.error('Error storing log:', error);
    }
  }

  /**
   * Safe JSON stringify replacer to handle circular references
   * @private
   */
  _safeStringify(key, value) {
    if (typeof value === 'object' && value !== null) {
      if (this.seen.has(value)) {
        return '[Circular Reference]';
      }
      this.seen.add(value);
    }
    return value;
  }

  /**
   * Get stored logs
   * @returns {Array} Stored logs
   */
  getStoredLogs() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
    } catch (error) {
      console.error('Error retrieving logs:', error);
      return [];
    }
  }

  /**
   * Clear stored logs
   */
  clearStoredLogs() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('Error clearing logs:', error);
    }
  }

  /**
   * Log a debug message
   * @param {string} message - Log message
   * @param {any} data - Additional data
   */
  debug(message, data) {
    this.log(LOG_LEVELS.DEBUG, message, data);
  }

  /**
   * Log an info message
   * @param {string} message - Log message
   * @param {any} data - Additional data
   */
  info(message, data) {
    this.log(LOG_LEVELS.INFO, message, data);
  }

  /**
   * Log a warning message
   * @param {string} message - Log message
   * @param {any} data - Additional data
   */
  warn(message, data) {
    this.log(LOG_LEVELS.WARN, message, data);
  }

  /**
   * Log an error message
   * @param {string} message - Log message
   * @param {any} data - Additional data
   */
  error(message, data) {
    this.log(LOG_LEVELS.ERROR, message, data);
  }
}

// Create and export a singleton instance
export const logger = new Logger();

// For compatibility with existing code
export default logger;
