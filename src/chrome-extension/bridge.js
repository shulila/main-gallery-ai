
/**
 * MainGallery.AI bridge script
 * Acts as a bridge between the web app and the extension content script
 */

// Using regular JavaScript variables instead of imports to avoid module issues
let logger = { 
  log: function(message, ...args) { console.log(`[MainGallery Bridge] ${message}`, ...args) },
  warn: function(message, ...args) { console.warn(`[MainGallery Bridge] ${message}`, ...args) },
  error: function(message, ...args) { console.error(`[MainGallery Bridge] ${message}`, ...args) },
  debug: function(message, ...args) { console.debug(`[MainGallery Bridge] ${message}`, ...args) }
};

function handleError(source, error, options = {}) {
  const errorMessage = error?.message || String(error);
  logger.error(`Error in ${source}: ${errorMessage}`, error);
  if (!options.silent) {
    console.error(`MainGallery Error in ${source}:`, error);
  }
}

// Domain helper functions
function getProductionDomain() {
  return 'main-gallery-hub.lovable.app';
}

function getPreviewDomain() {
  return 'preview-main-gallery-ai.lovable.app';
}

function getCorrectDomainUrl(url) {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    
    // If already on correct domain, return null (no redirect needed)
    if (urlObj.hostname === getProductionDomain() || 
        urlObj.hostname === getPreviewDomain()) {
      return null;
    }
    
    // If contains auth token but on wrong domain, redirect to production
    if ((urlObj.pathname.includes('/auth/callback') || 
         urlObj.search.includes('access_token=') || 
         urlObj.hash.includes('access_token=')) &&
        urlObj.hostname !== getProductionDomain()) {
      
      // Construct redirect to production domain
      const newUrl = new URL(url);
      newUrl.hostname = getProductionDomain();
      return newUrl.toString();
    }
    
    return null;
  } catch (err) {
    handleError('getCorrectDomainUrl', err);
    return null;
  }
}

logger.log('MainGallery.AI bridge script loaded');

// Handle messages from extension to web app
function setupBridge() {
  // Listen for runtime messages from the extension
  try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      logger.log('Bridge received message from extension:', message);
      
      // Pass the message to the web application
      if (message.type === 'GALLERY_IMAGES') {
        // Confirm receipt immediately to avoid "receiving end does not exist" errors
        sendResponse({ success: true, message: 'Images received by bridge' });
        
        // Forward the images to the web app via postMessage
        window.postMessage({
          type: 'GALLERY_IMAGES',
          images: message.images,
          source: 'extension_bridge',
          timestamp: Date.now()
        }, '*');
        
        logger.log('Forwarded gallery images to web app:', message.images?.length || 0);
      } else {
        sendResponse({ success: true });
      }
      
      // Always return true to indicate async response handling
      return true;
    });
    
    // Let the background script know the bridge is active
    try {
      chrome.runtime.sendMessage({
        action: 'bridgeConnected',
        host: window.location.host,
        path: window.location.pathname,
        timestamp: Date.now()
      }).catch(err => {
        logger.log('Could not notify background about bridge connection:', err);
      });
    } catch (err) {
      logger.log('Error notifying background about bridge:', err);
    }
  } catch (err) {
    handleError('setupMessageBridge', err);
  }
  
  // Listen for messages from web app to extension
  window.addEventListener('message', (event) => {
    // Only handle messages from this window and with the right format
    if (event.source !== window) return;
    
    // Forward web app messages to extension
    if (event.data && event.data.type === 'WEB_APP_TO_EXTENSION') {
      logger.log('Bridge forwarding message from web app to extension:', event.data);
      
      try {
        chrome.runtime.sendMessage(event.data)
          .then(response => {
            logger.log('Extension responded to forwarded message:', response);
          })
          .catch(err => {
            handleError('forwardToExtension', err);
          });
      } catch (err) {
        handleError('messageForwarding', err);
      }
    }
    
    // Handle ready for sync messages
    if (event.data && event.data.type === 'GALLERY_PAGE_READY') {
      logger.log('Gallery page is ready for sync, checking for pending images');
      
      // Check URL for sync flag
      const urlParams = new URLSearchParams(window.location.search);
      const syncRequested = urlParams.get('sync') === 'true';
      
      if (syncRequested) {
        // Notify the extension that we're ready for images
        try {
          chrome.runtime.sendMessage({
            action: 'galleryReady',
            url: window.location.href
          }).catch(err => {
            handleError('notifyGalleryReady', err);
          });
          
          // Clean up the URL by removing the sync parameter
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        } catch (err) {
          handleError('galleryReadyMessage', err);
        }
      }
      
      try {
        // Check if we have pending images stored in session storage
        const pendingSyncStr = sessionStorage.getItem('maingallery_sync_images');
        if (pendingSyncStr) {
          try {
            const pendingImages = JSON.parse(pendingSyncStr);
            logger.log(`Found ${pendingImages.length} pending images in session storage`);
            
            if (Array.isArray(pendingImages) && pendingImages.length > 0) {
              // Forward the images to the web app
              window.postMessage({
                type: 'GALLERY_IMAGES',
                images: pendingImages,
                source: 'extension_bridge'
              }, '*');
              
              logger.log('Forwarded pending images from session storage to web app');
            }
            
            // Clear the pending sync data
            sessionStorage.removeItem('maingallery_sync_images');
          } catch (e) {
            handleError('processPendingSync', e);
          }
        }
      } catch (err) {
        handleError('checkPendingSync', err);
      }
    }
    
    // Handle messages received from the web app
    if (event.data && event.data.type === 'GALLERY_IMAGES_RECEIVED') {
      logger.log('Web app confirmed receipt of gallery images:', event.data.count);
    }
    
    // Add debugging for all received messages from web app
    if (event.data && event.data.type) {
      logger.debug(`Bridge received message of type ${event.data.type} from web app:`, event.data);
    }
  });
  
  // Add domain fallback for auth callbacks with tokens
  try {
    const currentURL = window.location.href;
    const correctedURL = getCorrectDomainUrl(currentURL);
    
    if (correctedURL) {
      logger.warn("Detected incorrect domain for auth callback, redirecting to production domain");
      logger.log("Redirecting to:", correctedURL);
      window.location.href = correctedURL;
    }
  } catch (err) {
    handleError('domainFallbackCheck', err);
  }
  
  // Notify the page that the bridge is active
  setTimeout(() => {
    window.postMessage({
      type: 'EXTENSION_BRIDGE_READY',
      timestamp: Date.now()
    }, '*');
    logger.log('MainGallery.AI bridge notified page it is ready');
  }, 500);
  
  // Add new debug information about environment and platform
  logger.log('MainGallery.AI bridge environment info:', {
    location: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  });
  
  logger.log('MainGallery.AI bridge setup complete');
}

// Set up the bridge when the DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupBridge);
} else {
  setupBridge();
}
