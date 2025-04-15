
/**
 * Callback handler for MainGallery.AI Chrome Extension
 * COMPATIBILITY WRAPPER for new file structure
 */

import { logger } from './logger.js';
import { setupCallbackUrlListener, isCallbackUrl, processCallbackUrl } from './auth/callback-handler.js';

// Export the functions for backward compatibility
export {
  setupCallbackUrlListener,
  isCallbackUrl,
  processCallbackUrl
};

// Log that this compatibility module was loaded
logger.log("callback-handler.js compatibility wrapper loaded");
