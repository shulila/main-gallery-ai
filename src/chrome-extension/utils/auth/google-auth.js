
import { logger } from '../logger.js';

/**
 * קבלת מזהה הלקוח של Google מה-manifest
 * @returns {Promise<string>} מזהה הלקוח
 */
export async function getGoogleClientId() {
  try {
    const manifest = chrome.runtime.getManifest();
    const clientId = manifest.oauth2?.client_id;
    
    if (!clientId || !clientId.includes('.apps.googleusercontent.com')) {
      logger.error('Invalid Google client ID in manifest:', clientId);
      throw new Error('Invalid Google client ID configuration');
    }
    
    return clientId;
  } catch (error) {
    logger.error('Error getting Google client ID:', error);
    throw error;
  }
}

/**
 * יצירת כתובת אימות Google
 * @param {string} state - מזהה מצב האימות
 * @returns {string} כתובת האימות המלאה
 */
export function createGoogleAuthUrl(state) {
  const clientId = chrome.runtime.getManifest().oauth2.client_id;
  const redirectUri = encodeURIComponent('https://main-gallery-ai.lovable.app/auth/callback');
  const scope = encodeURIComponent('https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid');
  const responseType = 'token';
  
  return `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&scope=${scope}&state=${state}`;
}
