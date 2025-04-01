
console.log('MainGallery.AI content script loaded');

// Check if we're on a supported site before proceeding
function isSupportedSite() {
  // List of supported AI platforms
  const SUPPORTED_DOMAINS = [
    'midjourney.com',
    'leonardo.ai',
    'app.leonardo.ai',
    'openai.com',
    'labs.openai.com',
    'dreamstudio.ai',
    'stability.ai',
    'runway.com',
    'runwayml.com',
    'pika.art',
    'playgroundai.com',
    'creator.nightcafe.studio',
  ];

  // Check if the current domain matches any of the supported domains
  return SUPPORTED_DOMAINS.some(domain => 
    window.location.hostname.includes(domain));
}

// Inject the content script into the page
function injectScript() {
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('content-injection.js');
    script.onload = function() {
      this.remove();
      console.log('MainGallery.AI injection script loaded');
    };
    (document.head || document.documentElement).appendChild(script);
    
    // Listen for injection ready event
    window.addEventListener('MAINGALLERY_INJECTION_READY', () => {
      console.log('MainGallery.AI injection script ready');
    });
  } catch (err) {
    console.error('Error injecting script:', err);
  }
}

// Function to extract images from the page
function extractImages() {
  return new Promise((resolve, reject) => {
    try {
      if (!window.__MAINGALLERY__) {
        console.error('Main Gallery extraction utilities not available');
        resolve({ images: [], success: false });
        return;
      }
      
      const result = window.__MAINGALLERY__.extractAIImages();
      resolve({ 
        images: result.images || [], 
        success: result.images && result.images.length > 0 
      });
    } catch (err) {
      console.error('Error extracting images:', err);
      reject(err);
    }
  });
}

// Extract images with auto-scrolling
function extractImagesWithScrolling(options = {}) {
  return new Promise((resolve, reject) => {
    try {
      if (!window.__MAINGALLERY__) {
        console.error('Main Gallery extraction utilities not available');
        resolve({ images: [], success: false });
        return;
      }
      
      window.__MAINGALLERY__.extractAIImagesWithScroll(options)
        .then(result => {
          resolve({ 
            images: result.images || [], 
            success: result.images && result.images.length > 0 
          });
        })
        .catch(err => {
          console.error('Error extracting images with scrolling:', err);
          reject(err);
        });
    } catch (err) {
      console.error('Error initiating scroll extraction:', err);
      reject(err);
    }
  });
}

// Show unsupported site toast
function showUnsupportedSiteToast(message) {
  try {
    if (!window.__MAINGALLERY__) {
      console.error('Main Gallery utilities not available');
      return false;
    }
    
    window.__MAINGALLERY__.showUnsupportedSiteToast(message);
    return true;
  } catch (err) {
    console.error('Error showing unsupported site toast:', err);
    return false;
  }
}

// Check if we're on a supported site and inject script if necessary
if (isSupportedSite()) {
  console.log('MainGallery.AI running on supported site');
  injectScript();
} else {
  console.log('MainGallery.AI not running on unsupported site');
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  try {
    if (request.action === 'extractImages') {
      if (!isSupportedSite()) {
        sendResponse({ images: [], success: false, reason: 'unsupported_site' });
        return true;
      }
      
      extractImages()
        .then(result => {
          sendResponse(result);
        })
        .catch(err => {
          console.error('Error in extractImages:', err);
          sendResponse({ images: [], success: false, error: err.message });
        });
      
      return true; // Indicates async response
    } 
    else if (request.action === 'startAutoScan') {
      if (!isSupportedSite()) {
        sendResponse({ images: [], success: false, reason: 'unsupported_site' });
        return true;
      }
      
      console.log('Starting auto-scanning with scrolling');
      
      // First, send an immediate response that scanning has started
      sendResponse({ success: true, status: 'scan_started' });
      
      // Then start the actual scanning process
      extractImagesWithScrolling(request.options)
        .then(result => {
          console.log('Auto-scanning complete, found:', result.images.length);
          
          // Send the results back to background script
          chrome.runtime.sendMessage({
            action: 'scanComplete',
            images: result.images,
            success: result.success
          }).catch(err => {
            console.error('Error sending scan results to background:', err);
          });
        })
        .catch(err => {
          console.error('Error in auto-scanning process:', err);
          
          // Notify background script about failure
          chrome.runtime.sendMessage({
            action: 'scanComplete',
            images: [],
            success: false,
            error: err.message
          }).catch(err => {
            console.error('Error sending scan error to background:', err);
          });
        });
      
      return false; // We already sent the response
    }
    else if (request.action === 'showUnsupportedTabToast') {
      const message = request.message || "Please switch to a supported AI platform (Midjourney, DALL·E, etc) to use MainGallery.AI";
      const success = showUnsupportedSiteToast(message);
      sendResponse({ success });
      return false;
    }
    else if (request.action === 'checkPlatformLogin') {
      // This would ideally check if the user is logged into the platform
      // For now, we'll just assume they are if on a supported site
      sendResponse({ isLoggedIn: isSupportedSite() });
      return false;
    }
  } catch (err) {
    console.error('Error handling message in content script:', err);
    sendResponse({ success: false, error: err.message });
  }
});
