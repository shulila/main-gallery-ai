
/**
 * Authentication service for MainGallery.AI Chrome Extension
 * COMPATIBILITY WRAPPER for new file structure
 */

import { logger } from './logger.js';
import { authService as actualAuthService } from './auth/auth-service.js';

// Export the actual auth service for backward compatibility
export const authService = actualAuthService;

// Log that this compatibility module was loaded
logger.log("auth-service.js compatibility wrapper loaded");
