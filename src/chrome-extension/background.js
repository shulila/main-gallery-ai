/**
 * Background script for MainGallery.AI Chrome Extension
 * Fixed version with proper Google authentication handling
 */

import { logger } from './utils/logger.js';

// Initialize logger
logger.setLogLevel(logger.LOG_LEVELS.LOG);
logger.log('Background script initialized');

// Import auth utilities
import { isLoggedIn, setupAuthCallbackListener } from './utils/auth.js';
import { supabase } from './utils/supabaseClient.js';
import { safeSendMessage, ensureContentScriptLoaded } from './utils/messaging.js';

// Set up auth callback listener
setupAuthCallbackListener().catch(err => {
  logger.error('Error setting up auth callback listener:', err);
});

// Store the environment type in local storage (helps with detection in content scripts)
chrome.storage.local.set({ 'environment': 'production' }, () => {
  logger.log('Environment stored in local storage: production');
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logger.log('Received message:', message);
  
  // Check if user is logged in
  if (message.action === 'isLoggedIn') {
    isLoggedIn().then(loggedIn => {
      sendResponse({ loggedIn });
    }).catch(err => {
      logger.error('Error checking login status:', err);
      sendResponse({ loggedIn: false, error: err.message });
    });
    
    return true; // Keep channel open for async response
  }
  
  // Start Google authentication flow
  else if (message.action === 'startGoogleAuth') {
    handleGoogleAuth().then(result => {
      sendResponse(result);
    }).catch(err => {
      logger.error('Error in Google auth:', err);
      sendResponse({ success: false, error: err.message });
    });
    
    return true; // Keep channel open for async response
  }
  
  // Get the logged-in user's email
  else if (message.action === 'getUserEmail') {
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
  
  // Handle logout
  else if (message.action === 'logout') {
    import('./utils/auth.js').then(({ logout }) => {
      logout().then(result => {
        sendResponse(result);
      }).catch(err => {
        logger.error('Error logging out:', err);
        sendResponse({ success: false, error: err.message });
      });
    }).catch(err => {
      logger.error('Error importing auth module for logout:', err);
      sendResponse({ success: false, error: err.message });
    });
    
    return true; // Keep channel open for async response
  }
  
  // Handle other messages from the original background.js
  // ... keep existing code (other message handlers like CONTENT_SCRIPT_READY, scanComplete, openGallery, etc.)
  
  return true; // Keep channel open for potential async responses
});

/**
 * Handle Google authentication flow
 * This function is specifically designed to work in background.js
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function handleGoogleAuth() {
  try {
    logger.log('Starting Google auth flow...');
    
    // Get the client ID from manifest
    const manifest = chrome.runtime.getManifest();
    const clientId = manifest.oauth2?.client_id;
    
    if (!clientId) {
      throw new Error('OAuth client ID not found in manifest');
    }
    
    // Get the redirect URL
    const redirectURL = chrome.identity.getRedirectURL();
    logger.log('Redirect URL:', redirectURL);
    
    // Use chrome.identity.getAuthToken for a simpler flow that works better
    // This is more reliable than launchWebAuthFlow for Chrome extensions
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, async (token) => {
        if (chrome.runtime.lastError) {
          logger.error('Error getting auth token:', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (!token) {
          reject(new Error('No auth token received'));
          return;
        }
        
        try {
          logger.log('Got auth token, processing...');
          
          // Process the token with our custom handler
          const result = await supabase.auth.handleOAuthToken(token, 'google');
          
          if (result.error) {
            reject(new Error(result.error.message || 'Authentication failed'));
            return;
          }
          
          // Notify that auth state changed
          chrome.storage.local.set({ auth_event: 'SIGNED_IN' });
          
          // Success
          resolve({
            success: true,
            user: result.data?.user || result.data?.session?.user
          });
        } catch (error) {
          reject(error);
        }
      });
    });
  } catch (error) {
    logger.error('Error in handleGoogleAuth:', error);
    return { success: false, error: error.message || 'Authentication failed' };
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

// Check login status on startup
isLoggedIn().then(loggedIn => {
  logger.log('Initial login status:', loggedIn);
}).catch(err => {
  logger.error('Error checking initial login status:', err);
});

// Log that background script is loaded
logger.log('Background script loaded successfully');

// Chrome action click handler
chrome.action.onClicked.addListener((tab) => {
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
