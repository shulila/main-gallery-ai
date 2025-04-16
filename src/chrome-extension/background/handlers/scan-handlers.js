
/**
 * Scan functionality message handlers for background script
 */

import { logger } from '../../utils/logger.js';
import { safeSendMessage, ensureContentScriptLoaded } from '../../utils/messaging.js';

/**
 * Handle scan request
 * @param {Object} message - Message object
 * @param {Object} sender - Sender information
 * @param {Function} sendResponse - Response callback
 */
export async function handleStartScan(message, sender, sendResponse) {
  const tabId = message.tabId || (sender.tab && sender.tab.id);
  
  if (!tabId) {
    sendResponse({ success: false, error: 'No tab ID provided' });
    return;
  }
  
  try {
    const loaded = await ensureContentScriptLoaded(tabId);
    
    if (!loaded) {
      sendResponse({ success: false, error: 'Failed to load content script' });
      return;
    }
    
    // Forward the scan request to the content script
    const response = await safeSendMessage(tabId, { action: 'startAutoScan' });
    sendResponse(response);
  } catch (error) {
    logger.error('[MainGallery] Error starting scan:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle scan complete notification
 * @param {Object} message - Message object
 * @param {Function} sendResponse - Response callback
 */
export async function handleScanComplete(message, sendResponse) {
  // Process found images
  const images = message.images || [];
  logger.log(`[MainGallery] Scan complete, found ${images.length} images`);
  
  // Send notification
  if (images.length > 0) {
    chrome.notifications.create('scan-complete', {
      type: 'basic',
      iconUrl: 'assets/icons/icon128.png',
      title: 'Scan Complete',
      message: `Found ${images.length} images. They have been added to your gallery.`
    });
    
    // Could sync to server/storage here
  }
  
  sendResponse({ success: true });
}

/**
 * Handle adding a single image to gallery
 * @param {Object} message - Message object
 * @param {Function} sendResponse - Response callback
 */
export async function handleAddImage(message, sendResponse) {
  logger.log(`[MainGallery] Adding image: ${message.imageUrl}`);
  
  // Could save to local storage or sync to server here
  
  // Send notification
  chrome.notifications.create('image-added', {
    type: 'basic',
    iconUrl: 'assets/icons/icon128.png',
    title: 'Image Added',
    message: 'The image has been added to your gallery.'
  });
  
  sendResponse({ success: true });
}
