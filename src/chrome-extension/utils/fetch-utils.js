
import { logger } from './logger.js';

/**
 * ביצוע בקשת fetch עם טיפול בשגיאות
 * @param {string} url - כתובת ה-URL
 * @param {Object} options - אפשרויות הבקשה
 * @returns {Promise<Object>} תוצאת הבקשה
 */
export async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);
    
    // בדיקה אם התשובה היא תקינה
    if (!response.ok) {
      logger.error(`HTTP error ${response.status}: ${response.statusText}`);
      
      // ניסיון לקרוא את גוף התשובה
      try {
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          return { ok: false, status: response.status, error: errorData };
        } else {
          const errorText = await response.text();
          return { ok: false, status: response.status, error: errorText };
        }
      } catch (parseError) {
        logger.error('Error parsing error response:', parseError);
        return { ok: false, status: response.status, error: response.statusText };
      }
    }
    
    // בדיקה שהתשובה היא JSON תקין
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        const data = await response.json();
        return { ok: true, data };
      } catch (error) {
        logger.error('Error parsing JSON:', error);
        const text = await response.text();
        logger.error('Response text:', text);
        return { ok: false, error: 'Invalid JSON response', rawText: text };
      }
    } else {
      // אם התשובה אינה JSON, נחזיר את הטקסט
      const text = await response.text();
      return { ok: true, text };
    }
  } catch (error) {
    logger.error('Network error:', error);
    return { ok: false, error: error.message || 'Network error' };
  }
}
