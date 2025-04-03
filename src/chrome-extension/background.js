/**
 * MainGallery.AI background script
 * Responsible for coordinating extension operations and communicating with tabs
 */

import { logger } from './utils/logger.js';
import { handleError } from './utils/errorHandler.js';
import { isSupportedPlatformUrl, getGalleryUrl } from './utils/urlUtils.js';
import { safeSendMessage, ensureContentScriptLoaded } from './utils/messaging.js';
import { 
  isLoggedIn, 
  openAuthPage, 
  setupAuthCallbackListener,
  openAuthWithProvider
} from './utils/auth.js';
import { isGalleryEmpty, setGalleryHasImages } from './utils/galleryUtils.js';

logger.log('MainGallery.AI background script initialized');

// Create notification utility
function createNotification(id, title, message) {
  try {
    chrome.notifications.create(id, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: title,
      message: message
    });
  } catch (err) {
    handleError('createNotification', err, { silent: true });
  }
}

// Set up the auth callback listener immediately
setupAuthCallbackListener();

// Implement image syncing with improved error handling
async function syncImagesToGallery(images) {
  if (!images || images.length === 0) {
    logger.log('No images to sync');
    return false;
  }
  
  try {
    // Add metadata
    const enrichedImages = images.map(img => ({
      ...img,
      timestamp: img.timestamp || Date.now(),
      synced_at: Date.now()
    }));
    
    // Mark that we have images in the gallery
    await setGalleryHasImages(true);
    
    // Check if gallery tab is already open
    const galleryTabQuery = { url: `${getGalleryUrl()}*` };
    
    // Using promise-based approach to better handle errors
    try {
      const tabs = await chrome.tabs.query(galleryTabQuery);
      
      if (tabs.length > 0) {
        // If gallery is open, try to send messages through bridge
        logger.log('Gallery tab found, sending images via bridge');
        
        try {
          // First try sending message to the tab
          const response = await safeSendMessage(
            tabs[0].id, 
            { type: 'GALLERY_IMAGES', images: enrichedImages }
          );
          
          if (response && response.success) {
            logger.log('Successfully sent images to gallery tab:', response);
            // Focus the gallery tab
            chrome.tabs.update(tabs[0].id, { active: true });
            return true;
          } else {
            logger.log('Error sending to gallery tab:', response?.error || 'Unknown error');
            // Fallback to opening a new gallery tab
            openGalleryWithImages(enrichedImages);
            return true;
          }
        } catch (err) {
          handleError('syncToGalleryTab', err);
          // Fallback to opening a new gallery tab
          openGalleryWithImages(enrichedImages);
          return true;
        }
      } else {
        // Open gallery in a new tab with images
        openGalleryWithImages(enrichedImages);
        return true;
      }
    } catch (err) {
      handleError('queryGalleryTabs', err);
      // Fallback: just open a new gallery tab
      openGalleryWithImages(enrichedImages);
      return true;
    }
  } catch (err) {
    handleError('syncImagesToGallery', err);
    return false;
  }
}

// Open gallery with images to sync
function openGalleryWithImages(images) {
  // Create gallery tab with sync flag
  chrome.tabs.create({ url: `${getGalleryUrl()}?sync=true&from=extension` }, (tab) => {
    if (!tab) {
      logger.error('Failed to create gallery tab');
      return;
    }

    logger.log('Opened gallery tab with sync flag, tab ID:', tab.id);
    
    // Set up listener for when gallery tab is ready
    chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, updatedTab) {
      if (tabId === tab.id && changeInfo.status === 'complete' && 
          updatedTab.url && updatedTab.url.includes(getGalleryUrl())) {
        
        logger.log('Gallery tab fully loaded, waiting to ensure bridge is ready');
        
        // Wait a bit to ensure the page is fully loaded and bridge script is injected
        setTimeout(() => {
          try {
            safeSendMessage(
              tabId,
              { type: 'GALLERY_IMAGES', images: images }
            ).then(response => {
              if (response && response.success) {
                logger.log('Successfully sent images to new gallery tab');
              } else {
                logger.error('Error sending images to new tab:', response?.error || 'Unknown error');
                
                // Store images in session storage as fallback
                chrome.scripting.executeScript({
                  target: { tabId: tabId },
                  func: (imagesJson) => {
                    try {
                      window.sessionStorage.setItem('maingallery_sync_images', imagesJson);
                      console.log('Stored images in session storage for gallery to pick up');
                      
                      // Notify the page
                      window.postMessage({
                        type: 'GALLERY_SYNC_STORAGE',
                        count: JSON.parse(imagesJson).length,
                        timestamp: Date.now()
                      }, '*');
                    } catch (e) {
                      console.error('Error storing images in session storage:', e);
                    }
                  },
                  args: [JSON.stringify(images)]
                }).catch(err => {
                  logger.error('Error executing session storage script:', err);
                });
              }
            }).catch(err => {
              handleError('sendImagesToNewTab', err);
            });
          } catch (err) {
            handleError('sendImagesToGalleryTab', err);
          }
        }, 2000); // Increased delay to ensure page and bridge are ready
        
        chrome.tabs.onUpdated.removeListener(listener);
      }
    });
  });
}

// Handle action/icon clicks - Updated to check gallery state
chrome.action.onClicked.addListener(async (tab) => {
  logger.log('Extension icon clicked on tab:', tab?.url);
  
  if (!tab || !tab.url || !tab.id) {
    logger.error('Invalid tab or missing URL/ID');
    return;
  }
  
  // Check if URL is supported
  const supported = isSupportedPlatformUrl(tab.url);
  logger.log('URL supported:', supported, tab.url);
  
  // Check login status
  const loggedIn = await isLoggedIn();
  logger.log('User logged in:', loggedIn);
  
  // Always redirect to auth page if not logged in
  if (!loggedIn) {
    logger.log('User not logged in, redirecting to auth page');
    openAuthPage(null, { redirect: 'gallery', from: 'extension' });
    return;
  }
  
  // Handle unsupported site when logged in
  if (!supported) {
    logger.log('Tab URL not supported');
    
    // Check if gallery is empty
    const isEmpty = await isGalleryEmpty();
    logger.log('Gallery is empty:', isEmpty);
    
    if (isEmpty) {
      // Case 1: Initial Login (Empty Gallery State)
      // Redirect to the gallery page with empty state parameter
      chrome.tabs.create({ url: `${getGalleryUrl()}?state=empty` });
      
      // Show notification to guide the user
      createNotification(
        'maingallery_empty_gallery', 
        'Gallery is Empty', 
        'Your gallery is empty. Switch to a supported AI platform to add images.'
      );
    } else {
      // Case 2: Subsequent Logins (Populated Gallery State)
      // Redirect to the regular gallery page
      chrome.tabs.create({ url: getGalleryUrl() });
    }
    
    return;
  }
  
  // Handle supported site for logged-in user
  logger.log('User is logged in and on a supported tab, starting auto-scan');
  
  // Ensure content script is loaded
  const isReady = await ensureContentScriptLoaded(tab);
  if (!isReady) {
    logger.error('Content script could not be loaded');
    createNotification(
      'maingallery_error', 
      'Scan Error', 
      'Could not initialize scanner. Please refresh the page and try again.'
    );
    return;
  }
  
  // Content script is ready, send scan message
  const response = await safeSendMessage(
    tab.id, 
    { 
      action: 'startAutoScan',
      options: { scrollDelay: 500, scrollStep: 800 }
    }
  );
  
  if (response && response.success) {
    logger.log('Auto-scan initiated on page');
    
    createNotification(
      'maingallery_scan_started', 
      'Scanning Started', 
      'MainGallery is scanning the page for AI images. Please keep the tab open.'
    );
  } else {
    logger.log('Auto-scan could not be started, will retry:', response);
    
    // Already tried in safeSendMessage's auto-retry but failed
    // Show error to user
    createNotification(
      'maingallery_error', 
      'Scan Error', 
      'Could not scan the current page. Please refresh and try again.'
    );
  }
});

// Handle messages from content scripts with improved error handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logger.log('Message received in background script:', message);
  
  try {
    if (message.action === 'CONTENT_SCRIPT_READY') {
      logger.log('Content script ready on:', message.location);
      sendResponse({ success: true });
    }
    else if (message.action === 'log') {
      logger.log('FROM CONTENT SCRIPT:', message.data);
      sendResponse({ success: true });
    } 
    else if (message.action === 'openAuthPage') {
      openAuthPage(null, message);
      sendResponse({ success: true });
    }
    else if (message.action === 'openGoogleAuth') {
      // Handler specifically for Google auth button
      openAuthWithProvider('google');
      sendResponse({ success: true });
    }
    else if (message.action === 'scanComplete') {
      // Handle scan complete message from content script
      logger.log('Scan completed with', message.images?.length || 0, 'images');
      
      // Sync the images to gallery
      if (message.images && message.images.length > 0) {
        syncImagesToGallery(message.images);
        
        // Update gallery state to indicate we have images
        setGalleryHasImages(true);
        
        // Show success notification
        createNotification(
          'maingallery_sync_success', 
          'Images Synced', 
          `${message.images.length} images were found and synced to your gallery`
        );
      } else {
        // Show no images found notification
        createNotification(
          'maingallery_no_images', 
          'No Images Found', 
          'No AI images were found on this page.'
        );
      }
      
      sendResponse({ success: true });
    }
    else if (message.action === 'galleryReady') {
      logger.log('Gallery is ready to receive images:', message);
      sendResponse({ success: true });
    }
    else if (message.action === 'bridgeConnected') {
      logger.log('Bridge connected on:', message.host, message.path);
      sendResponse({ success: true });
    }
    else {
      // Default response for unhandled messages
      sendResponse({ success: true, action: 'default' });
    }
  } catch (err) {
    handleError('backgroundMessageHandler', err);
    sendResponse({ success: false, error: err.message });
  }
  
  return true; // Keep message channel open for async response
});
