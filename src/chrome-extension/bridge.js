
// Bridge script to facilitate communication between the extension and the web app
(function() {
  // Listen for messages from the web page
  window.addEventListener('message', (event) => {
    // Only accept messages from the same domain
    if (event.origin !== window.location.origin) return;
    
    // Check if the message is meant for the extension
    if (event.data && (event.data.type === 'GALLERY_PAGE_READY' || 
                      event.data.type === 'GALLERY_IMAGES_RECEIVED' ||
                      event.data.type === 'GALLERY_HAS_IMAGES')) {
      
      // Forward to the extension's background script
      try {
        if (event.data.type === 'GALLERY_PAGE_READY') {
          chrome.runtime.sendMessage({ 
            action: 'galleryReady',
            host: window.location.hostname,
            path: window.location.pathname,
          });
          
          // Notify web page that bridge is connected
          window.postMessage({
            type: 'EXTENSION_BRIDGE_READY'
          }, '*');
        } 
        else if (event.data.type === 'GALLERY_IMAGES_RECEIVED') {
          chrome.runtime.sendMessage({
            action: 'galleryImagesReceived',
            count: event.data.count
          });
        }
        else if (event.data.type === 'GALLERY_HAS_IMAGES') {
          // Update extension storage with gallery state
          chrome.storage.local.set({ 'gallery_has_images': event.data.hasImages });
          
          chrome.runtime.sendMessage({
            action: 'galleryStateUpdate',
            hasImages: event.data.hasImages
          });
        }
      } catch (error) {
        console.error('Error in bridge script:', error);
      }
    }
  });

  // Notify background script that bridge is connected
  chrome.runtime.sendMessage({
    action: 'bridgeConnected',
    host: window.location.hostname,
    path: window.location.pathname
  });

  // Listen for messages from the extension
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Forward messages to the web page
    if (message && message.type === 'GALLERY_IMAGES') {
      window.postMessage(message, '*');
      sendResponse({ success: true });
    }
    
    return true;
  });

  // Notify the web page that the bridge script is loaded
  setTimeout(() => {
    window.postMessage({
      type: 'EXTENSION_BRIDGE_READY'
    }, '*');
  }, 500);

  console.log('MainGallery bridge script loaded:', window.location.pathname);
})();
