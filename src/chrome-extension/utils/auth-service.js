
/**
 * Authentication service for MainGallery.AI Chrome Extension
 * COMPATIBILITY WRAPPER for new file structure
 */

import { logger } from './logger.js';
import { authService as actualAuthService } from './auth/auth-service.js';

// Export the actual auth service for backward compatibility
export const authService = actualAuthService;

// Add missing function to store a session manually
authService.setSession = async function(session) {
  try {
    // Use chrome.storage directly to be compatible
    await chrome.storage.local.set({ 'mg_session': session });
    if (session.user) {
      await chrome.storage.local.set({ 'mg_user': session.user });
    }
    return { success: true };
  } catch (error) {
    logger.error('Error setting session:', error);
    return { success: false, error: error.message };
  }
};

// Log that this compatibility module was loaded
logger.log("auth-service.js compatibility wrapper loaded");
