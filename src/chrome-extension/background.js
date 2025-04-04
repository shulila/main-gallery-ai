
/**
 * MainGallery.AI background script
 * Responsible for coordinating extension operations and communicating with tabs
 */

// Import required modules
import { logger } from './utils/logger.js';
import { handleError, safeFetch } from './utils/errorHandler.js';
import { isSupportedPlatformUrl, getGalleryUrl, getAuthUrl } from './utils/urlUtils.js';
import { safeSendMessage, ensureContentScriptLoaded } from './utils/messaging.js';
import { 
  isLoggedIn, 
  openAuthPage, 
  setupAuthCallbackListener,
  handleEmailPasswordLogin,
  logout
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

// Handle action/icon clicks - Direct open login or gallery
chrome.action.onClicked.addListener(async (tab) => {
  logger.log('Extension icon clicked on tab:', tab?.url);
  
  if (!tab || !tab.url || !tab.id) {
    logger.error('Invalid tab or missing URL/ID');
    return;
  }
  
  try {
    // Check login status first
    const loggedIn = await isLoggedIn();
    logger.log('User logged in status:', loggedIn);
    
    if (!loggedIn) {
      // User not logged in, redirect directly to auth page
      logger.log('User not logged in, opening auth page directly');
      
      // Get auth URL and open it in a new tab
      const authUrl = getAuthUrl({ from: 'extension_icon' });
      chrome.tabs.create({ url: authUrl });
      
      // Show a notification to guide the user
      createNotification(
        'maingallery_login_redirect',
        'Login Required',
        'Please log in to access your AI image gallery'
      );
      
      return;
    }
    
    // User is logged in, check if the current URL is supported
    const supported = isSupportedPlatformUrl(tab.url);
    logger.log('Current URL supported for scanning:', supported);
    
    if (supported) {
      // If on a supported site, start the auto scan
      const isReady = await ensureContentScriptLoaded(tab);
      
      if (isReady) {
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
          logger.error('Auto-scan could not be started:', response);
          
          // Show error to user
          createNotification(
            'maingallery_error', 
            'Scan Error', 
            'Could not scan the current page. Please refresh and try again.'
          );
        }
      } else {
        logger.error('Content script could not be loaded');
        createNotification(
          'maingallery_error', 
          'Scan Error', 
          'Could not initialize scanner. Please refresh the page and try again.'
        );
      }
    } else {
      // Not on a supported site, open the gallery directly
      logger.log('Not on a supported site, opening gallery');
      
      // Check if gallery is empty
      const isEmpty = await isGalleryEmpty();
      
      if (isEmpty) {
        // Case 1: Initial Login (Empty Gallery State)
        // Redirect to the gallery page with empty state parameter
        chrome.tabs.create({ url: `${getGalleryUrl()}?state=empty&from=extension_icon` });
        
        // Show notification to guide the user
        createNotification(
          'maingallery_empty_gallery', 
          'Gallery is Empty', 
          'Your gallery is empty. Switch to a supported AI platform to add images.'
        );
      } else {
        // Case 2: Subsequent Logins (Populated Gallery State)
        // Redirect to the regular gallery page
        chrome.tabs.create({ url: `${getGalleryUrl()}?from=extension_icon` });
      }
    }
  } catch (error) {
    handleError('iconClickHandler', error);
    
    // Fallback to opening auth page if any error occurs
    chrome.tabs.create({ url: getAuthUrl({ from: 'extension_icon_error' }) });
    
    createNotification(
      'maingallery_error',
      'Error',
      'An error occurred. Redirecting to login page.'
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
    else if (message.action === 'login') {
      // Handle standard email/password login
      const { email, password } = message;
      logger.log('Processing login request for email:', email);
      
      if (!email || !password) {
        logger.error('Missing email or password for login');
        sendResponse({ success: false, error: 'Email and password are required' });
        return true;
      }
      
      // Use the auth utility to handle login
      handleEmailPasswordLogin(email, password)
        .then(result => {
          logger.log('Login successful for:', email);
          sendResponse({ success: true, result });
        })
        .catch(error => {
          logger.error('Login failed:', error);
          sendResponse({ success: false, error: error.message || 'Login failed' });
        });
      
      return true; // Keep channel open for async response
    }
    else if (message.action === 'isLoggedIn') {
      // Check if user is logged in
      isLoggedIn()
        .then(loggedIn => {
          sendResponse({ loggedIn });
        })
        .catch(err => {
          logger.error('Error checking login status:', err);
          sendResponse({ loggedIn: false, error: err.message });
        });
      
      return true; // Keep channel open for async response
    }
    else if (message.action === 'getUserEmail') {
      // Get the logged-in user's email
      import('./utils/auth.js').then(({ getUserEmail }) => {
        getUserEmail().then(email => {
          sendResponse({ email });
        }).catch(err => {
          logger.error('Error getting user email:', err);
          sendResponse({ email: null, error: err.message });
        });
      }).catch(err => {
        logger.error('Error importing auth module for getUserEmail:', err);
        sendResponse({ email: null, error: err.message });
      });
      
      return true; // Keep channel open for async response
    }
    else if (message.action === 'openAuthPage') {
      openAuthPage(null, message);
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
    else if (message.action === 'openGallery') {
      // Open the gallery in a new tab or focus existing tab
      chrome.tabs.query({ url: `${getGalleryUrl()}*` }, (tabs) => {
        if (tabs.length > 0) {
          // Focus existing tab
          chrome.tabs.update(tabs[0].id, { active: true }, () => {
            // Also focus the window containing this tab
            chrome.windows.update(tabs[0].windowId, { focused: true });
          });
        } else {
          // Open new tab
          chrome.tabs.create({ url: getGalleryUrl() });
        }
      });
      sendResponse({ success: true });
    }
    else if (message.action === 'logout') {
      // Handle logout request with improved error handling
      logger.log('Processing logout request');
      
      logout()
        .then(() => {
          logger.log('Logout successful');
          // Clear any stored tokens and session data
          chrome.storage.sync.remove(['main_gallery_auth_token', 'main_gallery_user_email'], () => {
            logger.log('Storage cleared after logout');
          });
          sendResponse({ success: true });
        })
        .catch(err => {
          logger.error('Logout error:', err);
          // Try fallback logout by just clearing storage
          chrome.storage.sync.remove(['main_gallery_auth_token', 'main_gallery_user_email'], () => {
            logger.log('Storage cleared as fallback after logout error');
          });
          sendResponse({ success: false, error: err.message });
        });
      
      return true; // Keep message channel open for async response
    }
    else if (message.action === 'startAutoScan') {
      // Forward scan request to the active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs[0] || !tabs[0].id) {
          logger.error('No active tab found for scanning');
          sendResponse({ success: false, error: 'No active tab found' });
          return;
        }
        
        // Ensure content script is loaded on the active tab
        ensureContentScriptLoaded(tabs[0])
          .then(isReady => {
            if (isReady) {
              // Forward the auto-scan request to content script
              safeSendMessage(tabs[0].id, message)
                .then(response => {
                  sendResponse(response);
                })
                .catch(err => {
                  handleError('startAutoScanForward', err);
                  sendResponse({ success: false, error: err.message });
                });
            } else {
              logger.error('Could not load content script for scanning');
              sendResponse({ success: false, error: 'Could not initialize scanner' });
            }
          });
      });
      
      return true; // Keep message channel open for async response
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
