
import { logger } from '../logger.js';
import { storage, STORAGE_KEYS } from '../storage.js';
import { getGoogleClientId } from './google-auth.js';

// מפתחות לאחסון נתוני אימות
const AUTH_STORAGE_KEYS = {
  SESSION: 'auth_session',
  STATE: 'auth_state'
};

export const authService = {
  /**
   * קבלת סשן האימות הנוכחי
   * @returns {Promise<Object|null>} נתוני הסשן או null
   */
  async getSession() {
    try {
      const session = await storage.get(AUTH_STORAGE_KEYS.SESSION);
      
      if (!session) {
        return null;
      }
      
      // בדיקה אם הסשן פג תוקף
      if (session.expires_at && session.expires_at < Date.now()) {
        logger.warn('Session expired');
        return null;
      }
      
      return session;
    } catch (error) {
      logger.error('Error getting session:', error);
      return null;
    }
  },
  
  /**
   * שמירת סשן אימות
   * @param {Object} session - נתוני הסשן
   * @returns {Promise<boolean>} הצלחה/כישלון
   */
  async setSession(session) {
    try {
      await storage.set(AUTH_STORAGE_KEYS.SESSION, session);
      return true;
    } catch (error) {
      logger.error('Error setting session:', error);
      return false;
    }
  },
  
  /**
   * ניקוי סשן האימות
   * @returns {Promise<boolean>} הצלחה/כישלון
   */
  async clearSession() {
    try {
      await storage.remove(AUTH_STORAGE_KEYS.SESSION);
      return true;
    } catch (error) {
      logger.error('Error clearing session:', error);
      return false;
    }
  },
  
  /**
   * בדיקה אם המשתמש מחובר
   * @returns {Promise<boolean>} מצב האימות
   */
  async isAuthenticated() {
    try {
      const session = await this.getSession();
      return !!session && !!session.user;
    } catch (error) {
      logger.error('Error checking authentication:', error);
      return false;
    }
  },
  
  /**
   * קבלת פרטי המשתמש
   * @returns {Promise<Object|null>} פרטי המשתמש או null
   */
  async getUser() {
    try {
      const session = await this.getSession();
      return session?.user || null;
    } catch (error) {
      logger.error('Error getting user:', error);
      return null;
    }
  },
  
  /**
   * כניסה באמצעות Google
   * @returns {Promise<boolean>} הצלחה/כישלון
   */
  async signInWithGoogle() {
    try {
      // וידוא שמזהה הלקוח תקין לפני התחלת תהליך האימות
      const clientId = await getGoogleClientId();
      
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { action: 'initiateGoogleAuth', clientId },
          (response) => {
            if (chrome.runtime.lastError) {
              logger.error('Error initiating Google auth:', chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
            } else if (response && response.error) {
              logger.error('Google auth error:', response.error);
              reject(new Error(response.error));
            } else {
              logger.log('Google auth initiated successfully');
              resolve(true);
            }
          }
        );
      });
    } catch (error) {
      logger.error('Error in signInWithGoogle:', error);
      throw error;
    }
  },
  
  /**
   * כניסה באמצעות מייל וסיסמה
   * @param {string} email - כתובת מייל
   * @param {string} password - סיסמה
   * @returns {Promise<Object>} תוצאת הכניסה
   */
  async signInWithEmailPassword(email, password) {
    try {
      if (!email || !password) {
        return { success: false, error: 'Email and password are required' };
      }
      
      logger.log('Attempting email login');
      
      const response = await fetch('https://main-gallery-ai.lovable.app/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      // בדיקה אם התשובה היא תקינה
      if (!response.ok) {
        logger.error(`HTTP error ${response.status}: ${response.statusText}`);
        
        // ניסיון לקרוא את גוף התשובה
        try {
          const contentType = response.headers.get('content-type');
          
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            return { success: false, error: errorData.message || 'Authentication failed' };
          } else {
            const errorText = await response.text();
            return { success: false, error: errorText || 'Authentication failed' };
          }
        } catch (parseError) {
          logger.error('Error parsing error response:', parseError);
          return { success: false, error: response.statusText || 'Authentication failed' };
        }
      }
      
      // בדיקה שהתשובה היא JSON תקין
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          const data = await response.json();
          
          if (!data || !data.user) {
            return { success: false, error: 'Invalid response from authentication server' };
          }
          
          // שמירת פרטי המשתמש
          await this.setSession({
            user: data.user,
            provider: 'email',
            access_token: data.session?.access_token,
            refresh_token: data.session?.refresh_token,
            expires_at: Date.now() + (3600 * 1000), // שעה אחת
            created_at: Date.now()
          });
          
          return { success: true, user: data.user };
        } catch (error) {
          logger.error('Error parsing JSON:', error);
          return { success: false, error: 'Invalid JSON response' };
        }
      } else {
        // אם התשובה אינה JSON, נחזיר שגיאה
        const text = await response.text();
        logger.error('Non-JSON response:', text);
        return { success: false, error: 'Invalid response format from server' };
      }
    } catch (error) {
      logger.error('Error in email/password login:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error during login'
      };
    }
  },
  
  /**
   * יציאה מהמערכת
   * @returns {Promise<boolean>} הצלחה/כישלון
   */
  async signOut() {
    try {
      await this.clearSession();
      return true;
    } catch (error) {
      logger.error('Error signing out:', error);
      return false;
    }
  }
};
