
console.log('MainGallery.AI bridge script loaded');

// This script acts as a bridge between the web app and the extension content script
// It runs in the context of the web app and can forward messages

function setupBridge() {
  console.log('Setting up MainGallery.AI bridge');
  
  // Listen for runtime messages from the extension
  try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('Bridge received message from extension:', message);
      
      // Pass the message to the web application
      if (message.type === 'GALLERY_IMAGES') {
        console.log('Bridge forwarding GALLERY_IMAGES to web app:', message.images?.length || 0, 'images');
        
        // Forward the images to the web app via postMessage
        window.postMessage({
          type: 'GALLERY_IMAGES',
          images: message.images,
          source: 'extension_bridge'
        }, '*');
        
        // Send response back to extension
        sendResponse({ success: true, count: message.images?.length || 0 });
      }
    });
    
    // Let the background script know the bridge is active
    try {
      chrome.runtime.sendMessage({
        action: 'bridgeConnected',
        host: window.location.host,
        path: window.location.pathname
      }).catch(err => {
        console.log('Could not notify background about bridge connection:', err);
      });
    } catch (err) {
      console.log('Error notifying background about bridge connection:', err);
    }
  } catch (err) {
    console.error('Error setting up message bridge:', err);
  }
  
  // Listen for messages from web app to extension
  window.addEventListener('message', (event) => {
    // Only handle messages from this window
    if (event.source !== window) return;
    
    // Forward web app messages to extension
    if (event.data && event.data.type === 'WEB_APP_TO_EXTENSION') {
      console.log('Bridge forwarding message from web app to extension:', event.data);
      
      try {
        chrome.runtime.sendMessage(event.data).catch(err => {
          console.error('Error forwarding message to extension:', err);
        });
      } catch (err) {
        console.error('Failed to forward message to extension:', err);
      }
    }
    
    // Handle ready for sync messages
    if (event.data && event.data.type === 'GALLERY_PAGE_READY') {
      console.log('Gallery page is ready for sync');
      
      // Notify extension that gallery page is ready
      try {
        chrome.runtime.sendMessage({
          action: 'galleryReady',
          url: window.location.href
        }).catch(err => {
          console.log('Could not notify extension about gallery ready:', err);
        });
      } catch (err) {
        console.log('Error notifying extension about gallery ready:', err);
      }
      
      // Check URL for sync flag
      const urlParams = new URLSearchParams(window.location.search);
      const syncRequested = urlParams.get('sync') === 'true';
      
      if (syncRequested) {
        console.log('Sync requested via URL parameter');
        
        // Clean up the URL by removing the sync parameter
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
      
      // Check for pending sync data in sessionStorage
      try {
        const pendingSyncStr = sessionStorage.getItem('maingallery_sync_images');
        if (pendingSyncStr) {
          try {
            const pendingImages = JSON.parse(pendingSyncStr);
            console.log('Found pending sync images, forwarding to gallery:', pendingImages.length);
            
            if (Array.isArray(pendingImages) && pendingImages.length > 0) {
              // Forward the images to the web app
              window.postMessage({
                type: 'GALLERY_IMAGES',
                images: pendingImages,
                source: 'extension_bridge'
              }, '*');
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
  });
  
  // Notify the page that the bridge is active
  window.postMessage({
    type: 'EXTENSION_BRIDGE_READY',
    timestamp: Date.now()
  }, '*');
  
  console.log('MainGallery.AI bridge ready');
}

// Set up the bridge when the DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupBridge);
} else {
  setupBridge();
}
