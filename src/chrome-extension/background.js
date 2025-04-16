
/**
 * Background script for MainGallery.AI Chrome Extension
 */

import { logger } from './utils/logger.js';

// טיפול בהודעות מהתוסף
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logger.log('Background received message:', message);
  
  if (message.action === 'initiateGoogleAuth') {
    handleGoogleAuth(message.clientId)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => {
        logger.error('Google auth error:', error);
        sendResponse({ error: error.message });
      });
    return true; // חשוב! מציין שהתשובה תישלח באופן אסינכרוני
  }
  
  if (message.action === 'openGallery') {
    openGallery()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
  
  if (message.action === 'updateUI') {
    // עדכון ממשק המשתמש בכל החלונות הפתוחים
    sendResponse({ success: true });
    return false;
  }
  
  // אם הגענו לכאן, לא טיפלנו בהודעה
  sendResponse({ error: 'Unknown action' });
  return false;
});

/**
 * טיפול באימות Google
 * @param {string} clientId - מזהה הלקוח של Google
 * @returns {Promise<Object>} תוצאת האימות
 */
async function handleGoogleAuth(clientId) {
  try {
    if (!clientId || !clientId.includes('.apps.googleusercontent.com')) {
      throw new Error('Invalid Google client ID');
    }
    
    // יצירת מזהה ייחודי למצב האימות
    const state = Math.random().toString(36).substring(2, 15);
    
    // שמירת מצב האימות ב-storage
    await chrome.storage.local.set({ 'auth_state': state });
    
    // יצירת כתובת האימות
    const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent('https://main-gallery-ai.lovable.app/auth/callback')}&response_type=token&scope=${encodeURIComponent('https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid')}&state=${state}`;
    
    // פתיחת חלון אימות
    chrome.tabs.create({ url: authUrl });
    
    return { success: true };
  } catch (error) {
    logger.error('Error in handleGoogleAuth:', error);
    throw error;
  }
}

/**
 * פתיחת הגלריה בלשונית חדשה או מעבר ללשונית קיימת
 * @returns {Promise<void>}
 */
async function openGallery() {
  try {
    const galleryUrl = 'https://main-gallery-ai.lovable.app/gallery';
    
    // בדיקה אם יש כבר לשונית פתוחה עם הגלריה
    const tabs = await chrome.tabs.query({ url: galleryUrl + '*' });
    
    if (tabs.length > 0) {
      // אם יש לשונית פתוחה, נעבור אליה
      await chrome.tabs.update(tabs[0].id, { active: true });
      
      // אם הלשונית נמצאת בחלון אחר, נעבור לחלון הזה
      if (tabs[0].windowId !== chrome.windows.WINDOW_ID_CURRENT) {
        await chrome.windows.update(tabs[0].windowId, { focused: true });
      }
    } else {
      // אם אין לשונית פתוחה, נפתח לשונית חדשה
      await chrome.tabs.create({ url: galleryUrl });
    }
  } catch (error) {
    logger.error('Error opening gallery:', error);
    throw error;
  }
}

// התחלת שירות הרקע
logger.log('Background service worker initialized successfully');
