
import { logger } from '../logger.js';
import { authService } from './auth-service.js';

/**
 * סנכרון מצב האימות עם האתר
 * @returns {Promise<boolean>} הצלחה/כישלון
 */
export async function syncAuthState() {
  try {
    logger.log('Syncing auth state with website');
    
    // בדיקה אם יש טוקן אימות מקומי
    const session = await authService.getSession();
    
    if (!session || !session.access_token) {
      logger.log('No local auth token, clearing auth state');
      await authService.clearSession();
      return false;
    }
    
    // בדיקת מצב האימות מול השרת
    try {
      const response = await fetch('https://main-gallery-ai.lovable.app/api/auth/status', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        logger.warn(`Auth status check failed: ${response.status} ${response.statusText}`);
        
        // אם הטוקן פג תוקף, ננסה לרענן אותו
        if (response.status === 401 && session.refresh_token) {
          logger.log('Attempting to refresh token');
          
          try {
            const refreshResponse = await fetch('https://main-gallery-ai.lovable.app/api/auth/refresh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh_token: session.refresh_token })
            });
            
            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              
              if (refreshData?.access_token) {
                logger.log('Token refreshed successfully');
                
                // עדכון הסשן עם הטוקן החדש
                await authService.setSession({
                  ...session,
                  access_token: refreshData.access_token,
                  expires_at: Date.now() + (3600 * 1000) // שעה אחת
                });
                
                return true;
              }
            }
            
            // אם הרענון נכשל, ננקה את מצב האימות
            logger.warn('Token refresh failed, clearing auth state');
            await authService.clearSession();
            return false;
          } catch (refreshError) {
            logger.error('Error refreshing token:', refreshError);
            await authService.clearSession();
            return false;
          }
        } else {
          // אם יש שגיאה אחרת, ננקה את מצב האימות
          logger.warn('Auth status check failed, clearing auth state');
          await authService.clearSession();
          return false;
        }
      }
      
      // ניסיון לקרוא את התשובה כ-JSON
      try {
        const data = await response.json();
        
        // אם התשובה ריקה או לא תקינה
        if (!data || !data.user) {
          logger.warn('Invalid auth status response:', data);
          return false;
        }
        
        // עדכון פרטי המשתמש ב-storage
        await authService.setSession({
          ...session,
          user: data.user
        });
        
        return true;
      } catch (parseError) {
        logger.error('Error parsing auth status response:', parseError);
        return false;
      }
    } catch (fetchError) {
      logger.error('Error fetching auth status:', fetchError);
      return false;
    }
  } catch (error) {
    logger.error('Error syncing auth state:', error);
    return false;
  }
}
