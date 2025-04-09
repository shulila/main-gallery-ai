/**
 * MainGallery.AI background script
 * Responsible for coordinating extension operations and communicating with tabs
 */

console.log("[MainGallery] background.js is alive");

// Import required modules
import { logger } from './utils/logger.js';
import { handleError, safeFetch } from './utils/errorHandler.js';
import { 
  isSupportedPlatformUrl, 
  getGalleryUrl, 
  getAuthUrl, 
  isPreviewEnvironment,
  getBaseUrl 
} from './utils/urlUtils.js';
import { safeSendMessage, ensureContentScriptLoaded } from './utils/messaging.js';
import { 
  isLoggedIn, 
  openAuthPage, 
  setupAuthCallbackListener,
  handleEmailPasswordLogin,
  logout
} from './utils/auth.js';
import { 
  isGalleryEmpty, 
  setGalleryHasImages,
  logEnvironmentDetails 
} from './utils/galleryUtils.js';

logger.log('MainGallery.AI background script initialized');
logger.log('Environment check:', isPreviewEnvironment() ? 'PREVIEW' : 'PRODUCTION');

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

// Validate tab exists before attempting to communicate with it
async function tabExists(tabId) {
  try {
    return new Promise((resolve) => {
      chrome.tabs.get(tabId, (tab) => {
        const error = chrome.runtime.lastError;
        if (error) {
          logger.log(`Tab ${tabId} doesn't exist:`, error.message);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  } catch (error) {
    logger.error('Error checking if tab exists:', error);
    return false;
  }
}

// Set up the auth callback listener immediately
setupAuthCallbackListener();

// Store the environment type in local storage (helps with detection in content scripts)
chrome.storage.local.set({ 'environment': isPreviewEnvironment() ? 'preview' : 'production' }, () => {
  logger.log('Environment stored in local storage:', isPreviewEnvironment() ? 'preview' : 'production');
  
  // Log detailed environment info for debugging
  const envDetails = logEnvironmentDetails();
  logger.log('Environment details:', envDetails);
});

// Check if tab exists and content script can receive messages
async function verifyTabIsReady(tabId) {
  if (!tabId) return false;
  
  try {
    const exists = await tabExists(tabId);
    if (!exists) {
      logger.log(`Tab ${tabId} no longer exists`);
      return false;
    }
    
    // Try to check if content script is loaded
    return await ensureContentScriptLoaded({ id: tabId });
  } catch (error) {
    logger.error(`Error verifying tab ${tabId}:`, error);
    return false;
  }
}

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
        // If gallery is open, first verify the tab exists and is ready
        const isReady = await verifyTabIsReady(tabs[0].id);
        
        if (isReady) {
          // Try sending message to the tab
          try {
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
          logger.log('Gallery tab found but not ready, opening new tab');
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
          updatedTab.url && updatedTab.url.includes(getBaseUrl())) {
        
        logger.log('Gallery tab fully loaded, waiting to ensure bridge is ready');
        
        // Wait a bit to ensure the page is fully loaded and bridge script is injected
        setTimeout(async () => {
          try {
            // First check if tab still exists
            const tabStillExists = await tabExists(tabId);
            
            if (!tabStillExists) {
              logger.error('Tab no longer exists, cannot send images');
              chrome.tabs.onUpdated.removeListener(listener);
              return;
            }
            
            try {
              const response = await safeSendMessage(
                tabId,
                { type: 'GALLERY_IMAGES', images: images },
                { maxRetries: 2, retryDelay: 500 }
              );
              
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
            } catch (err) {
              handleError('sendImagesToNewTab', err);
            }
          } catch (err) {
            handleError('sendImagesToGalleryTab', err);
          }
        }, 2500); // Increased delay to ensure page and bridge are ready
        
        chrome.tabs.onUpdated.removeListener(listener);
      }
    });
  });
}

// Handle action/icon clicks - Direct open login or gallery
chrome.action.onClicked.addListener(async (tab) => {
  logger.log('Extension icon clicked on tab:', tab?.url);
  
  // First, log the current environment for easier debugging
  const environment = isPreviewEnvironment() ? 'PREVIEW' : 'PRODUCTION';
  const baseUrl = getBaseUrl();
  logger.log(`Environment: ${environment}, Base URL: ${baseUrl}`);
  
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
      logger.log('User not logged in, opening auth page');
      
      // Get auth URL and open it in a new tab
      const authUrl = getAuthUrl({ from: 'extension_icon' });
      logger.log('Opening auth URL:', authUrl);
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
      // First verify if tab still exists
      const tabStillExists = await tabExists(tab.id);
      
      if (!tabStillExists) {
        logger.error('Tab no longer exists, cannot scan');
        return;
      }
      
      // If on a supported site, start the auto scan
      const isReady = await ensureContentScriptLoaded(tab);
      
      if (isReady) {
        // Content script is ready, send scan message
        try {
          const response = await safeSendMessage(
            tab.id, 
            { 
              action: 'startAutoScan',
              options: { scrollDelay: 500, scrollStep: 800 }
            },
            { maxRetries: 2, retryDelay: 500 }
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
        } catch (err) {
          handleError('sendStartAutoScan', err);
          createNotification(
            'maingallery_error', 
            'Communication Error', 
            'Could not communicate with the page. Please refresh and try again.'
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
        const galleryUrl = `${getGalleryUrl()}?state=empty&from=extension_icon`;
        logger.log('Opening gallery URL (empty state):', galleryUrl);
        chrome.tabs.create({ url: galleryUrl });
        
        // Show notification to guide the user
        createNotification(
          'maingallery_empty_gallery', 
          'Gallery is Empty', 
          'Your gallery is empty. Switch to a supported AI platform to add images.'
        );
      } else {
        // Case 2: Subsequent Logins (Populated Gallery State)
        // Redirect to the regular gallery page
        const galleryUrl = `${getGalleryUrl()}?from=extension_icon`;
        logger.log('Opening gallery URL (populated):', galleryUrl);
        chrome.tabs.create({ url: galleryUrl });
      }
    }
  } catch (error) {
    handleError('iconClickHandler', error);
    
    // Fallback to opening auth page if any error occurs
    const authUrl = getAuthUrl({ from: 'extension_icon_error' });
    logger.log('Opening fallback auth URL:', authUrl);
    chrome.tabs.create({ url: authUrl });
    
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
          // Send success response
          sendResponse({ success: true });
        })
        .catch(err => {
          logger.error('Logout error:', err);
          // Send success response even with error since we cleaned up
          sendResponse({ success: true, warning: err.message });
        });
      
      return true; // Keep message channel open for async response
    }
    else if (message.action === 'startAutoScan') {
      // Forward scan request to the active tab
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (!tabs || !tabs[0] || !tabs[0].id) {
          logger.error('No active tab found for scanning');
          sendResponse({ success: false, error: 'No active tab found' });
          return;
        }
        
        // First verify tab still exists
        const tabStillExists = await tabExists(tabs[0].id);
        
        if (!tabStillExists) {
          logger.error('Tab no longer exists, cannot scan');
          sendResponse({ success: false, error: 'Tab no longer exists' });
          return;
        }
        
        // Ensure content script is loaded on the active tab
        try {
          const isReady = await ensureContentScriptLoaded(tabs[0]);
          
          if (isReady) {
            // Forward the auto-scan request to content script
            try {
              const response = await safeSendMessage(
                tabs[0].id, 
                message, 
                { maxRetries: 2, retryDelay: 500 }
              );
              sendResponse(response);
            } catch (err) {
              handleError('startAutoScanForward', err);
              sendResponse({ 
                success: false, 
                error: err.message || 'Communication error with content script' 
              });
            }
          } else {
            logger.error('Could not load content script for scanning');
            sendResponse({ success: false, error: 'Could not initialize scanner' });
          }
        } catch (err) {
          handleError('ensureContentScriptForScan', err);
          sendResponse({ 
            success: false, 
            error: 'Error initializing scanner: ' + (err.message || 'Unknown error') 
          });
        }
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
    else if (message.action === 'getEnvironmentDetails') {
      // New action to help with debugging - returns environment info
      const details = {
        isPreview: isPreviewEnvironment(),
        baseUrl: getBaseUrl(),
        galleryUrl: getGalleryUrl(),
        authUrl: getAuthUrl(),
        buildTimestamp: Date.now()
      };
      
      logger.log('Environment details requested:', details);
      sendResponse({ success: true, details });
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

// Immediately log environment details at startup for debugging
logger.log('ENVIRONMENT DETAILS AT STARTUP:');
logger.log('Is Preview:', isPreviewEnvironment());
logger.log('Base URL:', getBaseUrl());
logger.log('Gallery URL:', getGalleryUrl());
logger.log('Auth URL:', getAuthUrl());
