
// רמות לוג
export const LOG_LEVELS = {
  ERROR: 3,
  WARN: 2,
  INFO: 1,
  DEBUG: 0,
};

// רמת הלוג הנוכחית - ניתן לשנות בהתאם לסביבה
export const CURRENT_LOG_LEVEL = LOG_LEVELS.INFO;

// אובייקט הלוגר
export const logger = {
  /**
   * רישום שגיאה
   * @param {string} message - הודעה
   * @param {any} data - נתונים נוספים
   */
  error: function(message, data) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.ERROR) {
      try {
        console.error(`[MainGallery] [ERROR] ${message}`, data || '');
      } catch (e) {
        console.error('Logger error:', e);
      }
    }
  },
  
  /**
   * רישום אזהרה
   * @param {string} message - הודעה
   * @param {any} data - נתונים נוספים
   */
  warn: function(message, data) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.WARN) {
      try {
        console.warn(`[MainGallery] [WARN] ${message}`, data || '');
      } catch (e) {
        console.error('Logger error:', e);
      }
    }
  },
  
  /**
   * רישום מידע
   * @param {string} message - הודעה
   * @param {any} data - נתונים נוספים
   */
  log: function(message, data) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.INFO) {
      try {
        console.log(`[MainGallery] [INFO] ${message}`, data || '');
      } catch (e) {
        console.error('Logger error:', e);
      }
    }
  },
  
  /**
   * רישום מידע לניפוי באגים
   * @param {string} message - הודעה
   * @param {any} data - נתונים נוספים
   */
  debug: function(message, data) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
      try {
        console.debug(`[MainGallery] [DEBUG] ${message}`, data || '');
      } catch (e) {
        console.error('Logger error:', e);
      }
    }
  }
};
