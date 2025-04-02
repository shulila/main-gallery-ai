
console.log('MainGallery.AI bridge script loaded');

// This script acts as a bridge between the web app and the extension content script
// It runs in the context of the web app and can forward messages

// Handle messages from extension to web app
function setupBridge() {
  // Listen for runtime messages from the extension
  try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('Bridge received message from extension:', message);
      
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
        
        console.log('Forwarded gallery images to web app:', message.images?.length || 0);
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
        console.log('Could not notify background about bridge connection:', err);
      });
    } catch (err) {
      console.log('Error notifying background about bridge:', err);
    }
  } catch (err) {
    console.error('Error setting up message bridge:', err);
  }
  
  // Listen for messages from web app to extension
  window.addEventListener('message', (event) => {
    // Only handle messages from this window and with the right format
    if (event.source !== window) return;
    
    // Forward web app messages to extension
    if (event.data && event.data.type === 'WEB_APP_TO_EXTENSION') {
      console.log('Bridge forwarding message from web app to extension:', event.data);
      
      try {
        chrome.runtime.sendMessage(event.data)
          .then(response => {
            console.log('Extension responded to forwarded message:', response);
          })
          .catch(err => {
            console.error('Error forwarding message to extension:', err);
          });
      } catch (err) {
        console.error('Failed to forward message to extension:', err);
      }
    }
    
    // Handle ready for sync messages
    if (event.data && event.data.type === 'GALLERY_PAGE_READY') {
      console.log('Gallery page is ready for sync, checking for pending images');
      
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
            console.error('Error notifying extension gallery is ready:', err);
          });
          
          // Clean up the URL by removing the sync parameter
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        } catch (err) {
          console.error('Error sending galleryReady message:', err);
        }
      }
      
      try {
        // Check if we have pending images stored in session storage
        const pendingSyncStr = sessionStorage.getItem('maingallery_sync_images');
        if (pendingSyncStr) {
          try {
            const pendingImages = JSON.parse(pendingSyncStr);
            console.log(`Found ${pendingImages.length} pending images in session storage`);
            
            if (Array.isArray(pendingImages) && pendingImages.length > 0) {
              // Forward the images to the web app
              window.postMessage({
                type: 'GALLERY_IMAGES',
                images: pendingImages,
                source: 'extension_bridge'
              }, '*');
              
              console.log('Forwarded pending images from session storage to web app');
            }
            
            // Clear the pending sync data
            sessionStorage.removeItem('maingallery_sync_images');
          } catch (e) {
            console.error('Error processing pending sync images:', e);
          }
        }
      } catch (err) {
        console.error('Error checking for pending sync images:', err);
      }
    }
    
    // Handle messages received from the web app
    if (event.data && event.data.type === 'GALLERY_IMAGES_RECEIVED') {
      console.log('Web app confirmed receipt of gallery images:', event.data.count);
    }
    
    // Add debugging for all received messages from web app
    if (event.data && event.data.type) {
      console.log(`Bridge received message of type ${event.data.type} from web app:`, event.data);
    }
  });
  
  // Notify the page that the bridge is active
  setTimeout(() => {
    window.postMessage({
      type: 'EXTENSION_BRIDGE_READY',
      timestamp: Date.now()
    }, '*');
    console.log('MainGallery.AI bridge notified page it is ready');
  }, 500);
  
  // Add domain fallback for auth callbacks with tokens
  try {
    const currentURL = window.location.href;
    
    // If accidentally on preview domain with token, redirect to production domain
    if (
      currentURL.includes("preview-main-gallery-ai.lovable.app/auth/callback") &&
      (currentURL.includes("#access_token=") || currentURL.includes("?access_token="))
    ) {
      console.warn("Detected incorrect domain for auth callback, redirecting to production domain");
      const correctedURL = currentURL.replace(
        "preview-main-gallery-ai.lovable.app",
        "main-gallery-hub.lovable.app"
      );
      console.log("Redirecting to:", correctedURL);
      window.location.href = correctedURL;
    }
  } catch (err) {
    console.error('Error in domain fallback check:', err);
  }
  
  // Add new debug information about environment and platform
  console.log('MainGallery.AI bridge environment info:', {
    location: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  });
  
  console.log('MainGallery.AI bridge setup complete');
}

// Set up the bridge when the DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupBridge);
} else {
  setupBridge();
}
