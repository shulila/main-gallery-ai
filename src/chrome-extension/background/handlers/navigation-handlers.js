
/**
 * Navigation and UI related message handlers for background script
 */

import { logger } from '../../utils/logger.js';

/**
 * Handle open gallery request
 * @param {Function} sendResponse - Response callback
 */
export function handleOpenGallery(sendResponse) {
  const galleryUrl = 'https://main-gallery-ai.lovable.app/gallery';
  
  // Check if a gallery tab is already open
  chrome.tabs.query({ url: `${galleryUrl}*` }, (tabs) => {
    if (tabs.length > 0) {
      // Focus the existing tab
      chrome.tabs.update(tabs[0].id, { active: true });
      chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
      // Open a new tab
      chrome.tabs.create({ url: galleryUrl });
    }
    
    if (sendResponse) {
      sendResponse({ success: true });
    }
  });
}
