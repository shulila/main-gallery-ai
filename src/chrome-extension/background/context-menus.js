
/**
 * Context menus setup for MainGallery.AI extension
 */

import { logger } from '../utils/logger.js';

/**
 * Sets up context menus for the extension
 */
export function setupContextMenus() {
  try {
    // Remove any existing menu items first
    chrome.contextMenus.removeAll(() => {
      // Create a context menu for images
      chrome.contextMenus.create({
        id: 'addToGallery',
        title: 'Add to MainGallery',
        contexts: ['image']
      });
      
      // Create a context menu for the active AI platform
      chrome.contextMenus.create({
        id: 'scanAiPlatform',
        title: 'Scan this AI platform',
        contexts: ['page']
      });
      
      // Create a context menu for opening gallery
      chrome.contextMenus.create({
        id: 'openGallery',
        title: 'Open MainGallery',
        contexts: ['action']
      });
      
      logger.log("[MainGallery] Context menus created");
    });
    
    // Set up click handler
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      switch (info.menuItemId) {
        case 'addToGallery':
          if (info.srcUrl) {
            handleAddImageToGallery(info.srcUrl, tab);
          }
          break;
          
        case 'scanAiPlatform':
          handleScanPlatform(tab);
          break;
          
        case 'openGallery':
          handleOpenGallery();
          break;
      }
    });
  } catch (error) {
    logger.error('[MainGallery] Error setting up context menus:', error);
  }
}

/**
 * Handles adding a single image to gallery
 */
function handleAddImageToGallery(imageUrl, tab) {
  logger.log(`[MainGallery] Adding image to gallery: ${imageUrl}`);
  
  // Send a message to the background script to handle the image
  chrome.runtime.sendMessage({
    action: 'addImageToGallery',
    imageUrl,
    sourceUrl: tab?.url
  });
}

/**
 * Handles scanning the current platform
 */
function handleScanPlatform(tab) {
  if (!tab?.id) return;
  
  logger.log(`[MainGallery] Scanning platform at: ${tab.url}`);
  
  // Send a message to the background script to handle scanning
  chrome.runtime.sendMessage({
    action: 'startAutoScan',
    tabId: tab.id
  });
}

/**
 * Handles opening the gallery
 */
function handleOpenGallery() {
  logger.log('[MainGallery] Opening gallery');
  
  // Send a message to the background script to open the gallery
  chrome.runtime.sendMessage({
    action: 'openGallery'
  });
}
