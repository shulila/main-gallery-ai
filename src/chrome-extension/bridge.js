
// Content script bridge for communication between the extension and web app

console.log('MainGallery bridge content script loaded');

// Handle messages from the extension popup/background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Bridge received message:', message.action);
  
  if (message.action === 'syncImagesToGallery' && message.images) {
    console.log(`Bridge: syncing ${message.images.length} images to gallery`);
    
    try {
      // Forward the images to the web app via window.postMessage
      window.postMessage({
        type: 'GALLERY_IMAGES',
        images: message.images,
        source: 'MAIN_GALLERY_EXTENSION'
      }, '*');
      
      console.log('Images posted to web app via window.postMessage');
      sendResponse({ success: true });
    } catch (err) {
      console.error('Error forwarding images to web app:', err);
      sendResponse({ success: false, error: err.message });
    }
    
    return true; // Keep channel open for async response
  }
  
  // Always return true if we want to send a response asynchronously
  return true;
});

// Listen for messages from the web app
window.addEventListener('message', (event) => {
  // Verify the sender is our own window
  if (event.source !== window) return;
  
  // Handle messages from web app to extension
  if (event.data && event.data.type === 'WEB_APP_TO_EXTENSION') {
    console.log('Bridge received message from web app:', event.data);
    
    // Forward to extension background script
    chrome.runtime.sendMessage(event.data);
  }
  
  // Listen for confirmation that the web app received our images
  if (event.data && event.data.type === 'GALLERY_IMAGES_RECEIVED') {
    console.log('Web app confirmed receipt of gallery images:', event.data.count);
    
    // Forward confirmation to extension
    chrome.runtime.sendMessage({
      action: 'galleryImagesReceived',
      count: event.data.count
    });
  }
});

// Notify that bridge is ready
console.log('MainGallery bridge ready for communication');

// Announce bridge presence to web app
setTimeout(() => {
  window.postMessage({ 
    type: 'EXTENSION_BRIDGE_READY',
    source: 'MAIN_GALLERY_EXTENSION'
  }, '*');
}, 1000);
