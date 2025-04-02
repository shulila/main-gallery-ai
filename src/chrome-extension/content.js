
/**
 * MainGallery.AI content script
 * Responsible for scanning and extracting images from supported AI platforms
 */

import { logger } from './utils/logger.js';
import { handleError } from './utils/errorHandler.js';
import { isSupportedPlatformUrl, getPlatformIdFromUrl } from './utils/urlUtils.js';
import { autoScrollToBottom, showToast, setupMutationObserver, setupMidjourneyObserver } from './utils/domUtils.js';
import { extractImages } from './utils/imageExtraction.js';

logger.log('MainGallery.AI content script loaded');

// Message the background script when content script loads
function notifyBackgroundScriptReady() {
  try {
    chrome.runtime.sendMessage({ 
      action: 'CONTENT_SCRIPT_READY',
      location: window.location.href
    });
  } catch (err) {
    handleError('notifyBackgroundScriptReady', err);
  }
}

// Inject the content script into the page
function injectScript() {
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('content-injection.js');
    script.onload = function() {
      this.remove();
      logger.log('MainGallery.AI injection script loaded');
    };
    (document.head || document.documentElement).appendChild(script);
    
    // Listen for injection ready event
    window.addEventListener('MAINGALLERY_INJECTION_READY', () => {
      logger.log('MainGallery.AI injection script ready');
      
      // Notify background script that content script is ready
      notifyBackgroundScriptReady();
    });
  } catch (err) {
    handleError('injectScript', err);
  }
}

// Check if we're on a supported site and inject script
if (isSupportedPlatformUrl(window.location.href)) {
  logger.log('MainGallery.AI running on supported site:', window.location.hostname);
  injectScript();
  
  // Set up mutation observer for dynamic content
  setupMutationObserver((mutations, hasNewImages) => {
    if (hasNewImages) {
      logger.log('Detected new images added to DOM');
    }
  });
  
  // Additional setup specifically for Midjourney
  if (window.location.hostname.includes('midjourney')) {
    logger.log('Detected Midjourney site, setting up specialized handling');
    
    // Set up enhanced mutation observer for Midjourney's dynamic content
    setupMidjourneyObserver((mutations, hasChanges) => {
      if (hasChanges) {
        logger.log('Midjourney observer detected DOM changes');
        
        // Count visible images for debug purposes
        const visibleImages = document.querySelectorAll('img[src]:not([src^="data:"])');
        logger.log(`Midjourney has ${visibleImages.length} visible images on page now`);
      }
    });
    
    logger.log('Midjourney specialized observer set up');
  }
  
  // Send ready message to background script
  notifyBackgroundScriptReady();
} else {
  logger.log('MainGallery.AI not running on unsupported site:', window.location.hostname);
}

// Handle auto-scanning functionality
async function handleAutoScan(options = {}) {
  try {
    if (!isSupportedPlatformUrl(window.location.href)) {
      logger.log('Not a supported site, not scanning');
      showToast('This site is not supported for image scanning', 'error');
      return { success: false, reason: 'unsupported_site' };
    }
    
    // Start the auto-scan process
    try {
      // Auto-scroll to the bottom of the page
      await autoScrollToBottom(options);
      logger.log('Auto-scroll complete, extracting images');
      
      // After scrolling, extract all images
      const result = extractImages();
      const images = result.images || [];
      logger.log(`Found ${images.length} images after scrolling`);
      
      // Show success toast
      if (images.length > 0) {
        showToast(`Found ${images.length} images, sending to gallery`, 'success');
      } else {
        showToast('No images found on this page', 'info');
      }
      
      // Send the results back to background script
      chrome.runtime.sendMessage({
        action: 'scanComplete',
        images: images,
        success: images.length > 0
      }).catch(err => {
        handleError('sendScanResults', err);
        showToast('Error syncing images to gallery', 'error');
      });
      
      return { success: true, imageCount: images.length };
    } catch (err) {
      handleError('autoScanProcess', err);
      showToast('Error during page scanning', 'error');
      
      // Notify background script about failure
      try {
        chrome.runtime.sendMessage({
          action: 'scanComplete',
          images: [],
          success: false,
          error: err.message
        }).catch(e => handleError('sendScanError', e, { silent: true }));
      } catch (e) {
        handleError('sendScanErrorFailure', e, { silent: true });
      }
      
      return { success: false, error: err.message };
    }
  } catch (err) {
    handleError('handleAutoScan', err);
    return { success: false, error: err.message };
  }
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  logger.log('Content script received message:', request);
  
  try {
    // Always respond to ping requests to establish connection
    if (request.action === 'ping' || request.action === 'PING') {
      logger.log('Received ping, responding with pong');
      sendResponse({ success: true, action: 'pong', from: 'content_script' });
      return true;
    }
    
    if (request.action === 'extractImages') {
      if (!isSupportedPlatformUrl(window.location.href)) {
        sendResponse({ images: [], success: false, reason: 'unsupported_site' });
        return true;
      }
      
      const result = extractImages();
      sendResponse(result);
      return true;
    } 
    else if (request.action === 'startAutoScan') {
      logger.log('Starting auto-scanning with scrolling');
      
      // Immediately send response that scan started (important to avoid connection errors)
      sendResponse({ success: true, status: 'scan_started' });
      
      // Process the scan asynchronously (we already responded to avoid connection errors)
      handleAutoScan(request.options);
      
      return true; // we've already sent the response
    }
    else if (request.action === 'showUnsupportedTabToast') {
      const message = request.message || "Please switch to a supported AI platform (Midjourney, DALL·E, etc) to use MainGallery.AI";
      showToast(message, 'error');
      sendResponse({ success: true });
      return true;
    }
  } catch (err) {
    handleError('contentScriptMessageHandler', err);
    sendResponse({ success: false, error: err.message });
  }
  
  return true; // Keep channel open for async response
});

// Send initial ready message for monitoring
logger.log('MainGallery.AI content script fully loaded and initialized');
notifyBackgroundScriptReady();
