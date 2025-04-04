
/**
 * MainGallery.AI content script
 * Responsible for scanning and extracting images from supported AI platforms
 */

// Use inline module definitions to avoid import errors
const logger = {
  log: function(message, ...args) {
    console.log(`[MainGallery]: INFO: ${message}`, ...args);
  },
  error: function(message, ...args) {
    console.error(`[MainGallery]: ERROR: ${message}`, ...args);
  },
  warn: function(message, ...args) {
    console.warn(`[MainGallery]: WARN: ${message}`, ...args);
  }
};

// Error handler function
function handleError(context, error, options = {}) {
  const { silent = false, rethrow = false } = options;
  
  if (!silent) {
    logger.error(`Error in ${context}: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  if (rethrow) {
    throw error;
  }
}

// URL Utilities
function isSupportedPlatformUrl(url) {
  if (!url) return false;
  
  const SUPPORTED_PLATFORMS = [
    'midjourney.com',
    'leonardo.ai',
    'openai.com',
    'dreamstudio.ai',
    'stability.ai',
    'runwayml.com',
    'pika.art',
    'discord.com/channels',
    'playgroundai.com',
    'creator.nightcafe.studio'
  ];
  
  try {
    const urlObj = new URL(url);
    return SUPPORTED_PLATFORMS.some(platform => 
      urlObj.hostname.includes(platform) || 
      (platform.includes('discord.com') && urlObj.pathname.includes('midjourney'))
    );
  } catch (err) {
    handleError('isSupportedPlatformUrl', err, { silent: true });
    return false;
  }
}

function getPlatformIdFromUrl(url) {
  if (!url) return null;
  
  const SUPPORTED_PLATFORMS = [
    'midjourney.com',
    'leonardo.ai',
    'openai.com',
    'dreamstudio.ai',
    'stability.ai',
    'runwayml.com',
    'pika.art',
    'discord.com/channels',
    'playgroundai.com',
    'creator.nightcafe.studio'
  ];
  
  try {
    const urlObj = new URL(url);
    
    for (const platform of SUPPORTED_PLATFORMS) {
      if (urlObj.hostname.includes(platform)) {
        return platform.split('.')[0];
      }
    }
    
    if (urlObj.hostname.includes('discord.com') && urlObj.pathname.includes('midjourney')) {
      return 'midjourney';
    }
    
    return null;
  } catch (err) {
    handleError('getPlatformIdFromUrl', err, { silent: true });
    return null;
  }
}

// DOM Utilities
function showToast(message, type = 'info') {
  try {
    const toast = document.createElement('div');
    toast.className = `maingallery-toast maingallery-toast-${type}`;
    toast.textContent = message;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.onclick = () => toast.remove();
    toast.appendChild(closeBtn);
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
      setTimeout(() => toast.remove(), 5000);
    }, 100);
  } catch (err) {
    handleError('showToast', err, { silent: true });
  }
}

async function autoScrollToBottom(options = {}) {
  const { scrollDelay = 300, scrollStep = 500, maxScroll = 50 } = options;
  
  return new Promise((resolve) => {
    let scrollCount = 0;
    const scrollInterval = setInterval(() => {
      window.scrollBy(0, scrollStep);
      scrollCount++;
      
      if (scrollCount >= maxScroll || 
          (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 200) {
        clearInterval(scrollInterval);
        setTimeout(resolve, 500); // Give time for images to load
      }
    }, scrollDelay);
  });
}

function setupMutationObserver(callback) {
  try {
    const observer = new MutationObserver((mutations) => {
      const hasNewImages = mutations.some(mutation => {
        return Array.from(mutation.addedNodes).some(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node;
            return element.tagName === 'IMG' || element.querySelector('img');
          }
          return false;
        });
      });
      
      if (typeof callback === 'function') {
        callback(mutations, hasNewImages);
      }
    });
    
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['src']
    });
    
    return observer;
  } catch (err) {
    handleError('setupMutationObserver', err);
    return null;
  }
}

function setupMidjourneyObserver(callback) {
  try {
    if (!window.location.hostname.includes('midjourney')) {
      return null;
    }
    
    const observerConfig = { 
      childList: true, 
      subtree: true, 
      attributes: true, 
      attributeFilter: ['src', 'style', 'class'] 
    };
    
    const observer = new MutationObserver((mutations) => {
      const hasChanges = mutations.some(mutation => {
        // Check for new images or image attribute changes
        return (
          mutation.type === 'childList' && 
          Array.from(mutation.addedNodes).some(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node;
              return element.tagName === 'IMG' || element.querySelector('img');
            }
            return false;
          })
        ) || (
          mutation.type === 'attributes' && 
          mutation.attributeName === 'src' && 
          mutation.target.tagName === 'IMG'
        );
      });
      
      if (typeof callback === 'function') {
        callback(mutations, hasChanges);
      }
    });
    
    // Start observing for all image containers
    const imageContainers = [
      document.body, // Full document
      document.querySelector('#app'), // Main app container
      document.querySelector('.gallery'), // Gallery view
      document.querySelector('.feed') // Feed view
    ].filter(Boolean);
    
    imageContainers.forEach(container => {
      observer.observe(container, observerConfig);
    });
    
    return observer;
  } catch (err) {
    handleError('setupMidjourneyObserver', err);
    return null;
  }
}

// Image Extraction
function extractImages() {
  try {
    const images = [];
    const seenUrls = new Set();
    const platformId = getPlatformIdFromUrl(window.location.href);
    
    // Find all images on the page
    const imgElements = document.querySelectorAll('img[src]:not([src^="data:"]):not([src^="blob:"])');
    
    imgElements.forEach(img => {
      try {
        const src = img.src;
        if (!src || seenUrls.has(src)) return;
        
        // Ignore very small images or icons
        if (img.width < 100 || img.height < 100) return;
        
        // Collect necessary metadata
        const imageData = {
          url: src,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          alt: img.alt || '',
          title: img.title || '',
          platform: platformId || 'unknown',
          sourceUrl: window.location.href,
          timestamp: Date.now(),
          pageTitle: document.title
        };
        
        // Add to our collection and mark as seen
        images.push(imageData);
        seenUrls.add(src);
      } catch (imgErr) {
        // Silently handle individual image errors
        console.error('Error processing image:', imgErr);
      }
    });
    
    return { images, success: images.length > 0, count: images.length };
  } catch (err) {
    handleError('extractImages', err);
    return { images: [], success: false, error: err.message };
  }
}

// Message the background script when content script loads
function notifyBackgroundScriptReady() {
  try {
    chrome.runtime.sendMessage({ 
      action: 'CONTENT_SCRIPT_READY',
      location: window.location.href
    });
  } catch (err) {
    handleError('notifyBackgroundScriptReady', err);
  }
}

// Handle auto-scanning functionality
async function handleAutoScan(options = {}) {
  try {
    if (!isSupportedPlatformUrl(window.location.href)) {
      logger.log('Not a supported site, not scanning');
      showToast('This site is not supported for image scanning', 'error');
      return { success: false, reason: 'unsupported_site' };
    }
    
    // Start the auto-scan process
    try {
      // Auto-scroll to the bottom of the page
      await autoScrollToBottom(options);
      logger.log('Auto-scroll complete, extracting images');
      
      // After scrolling, extract all images
      const result = extractImages();
      const images = result.images || [];
      logger.log(`Found ${images.length} images after scrolling`);
      
      // Show success toast
      if (images.length > 0) {
        showToast(`Found ${images.length} images, sending to gallery`, 'success');
      } else {
        showToast('No images found on this page', 'info');
      }
      
      // Send the results back to background script
      chrome.runtime.sendMessage({
        action: 'scanComplete',
        images: images,
        success: images.length > 0
      }).catch(err => {
        handleError('sendScanResults', err);
        showToast('Error syncing images to gallery', 'error');
      });
      
      return { success: true, imageCount: images.length };
    } catch (err) {
      handleError('autoScanProcess', err);
      showToast('Error during page scanning', 'error');
      
      // Notify background script about failure
      try {
        chrome.runtime.sendMessage({
          action: 'scanComplete',
          images: [],
          success: false,
          error: err.message
        }).catch(e => handleError('sendScanError', e, { silent: true }));
      } catch (e) {
        handleError('sendScanErrorFailure', e, { silent: true });
      }
      
      return { success: false, error: err.message };
    }
  } catch (err) {
    handleError('handleAutoScan', err);
    return { success: false, error: err.message };
  }
}

// Main content script logic
logger.log('MainGallery.AI content script loaded');

// Check if we're on a supported site
if (isSupportedPlatformUrl(window.location.href)) {
  logger.log('MainGallery.AI running on supported site:', window.location.hostname);
  
  // Set up mutation observer for dynamic content
  setupMutationObserver((mutations, hasNewImages) => {
    if (hasNewImages) {
      logger.log('Detected new images added to DOM');
    }
  });
  
  // Additional setup specifically for Midjourney
  if (window.location.hostname.includes('midjourney')) {
    logger.log('Detected Midjourney site, setting up specialized handling');
    
    // Set up enhanced mutation observer for Midjourney's dynamic content
    setupMidjourneyObserver((mutations, hasChanges) => {
      if (hasChanges) {
        logger.log('Midjourney observer detected DOM changes');
        
        // Count visible images for debug purposes
        const visibleImages = document.querySelectorAll('img[src]:not([src^="data:"])');
        logger.log(`Midjourney has ${visibleImages.length} visible images on page now`);
      }
    });
    
    logger.log('Midjourney specialized observer set up');
  }
  
  // Send ready message to background script
  notifyBackgroundScriptReady();
} else {
  logger.log('MainGallery.AI not running on unsupported site:', window.location.hostname);
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  logger.log('Content script received message:', request);
  
  try {
    // Always respond to ping requests to establish connection
    if (request.action === 'ping' || request.action === 'PING') {
      logger.log('Received ping, responding with pong');
      sendResponse({ success: true, action: 'pong', from: 'content_script' });
      return true;
    }
    
    if (request.action === 'extractImages') {
      if (!isSupportedPlatformUrl(window.location.href)) {
        sendResponse({ images: [], success: false, reason: 'unsupported_site' });
        return true;
      }
      
      const result = extractImages();
      sendResponse(result);
      return true;
    } 
    else if (request.action === 'startAutoScan') {
      logger.log('Starting auto-scanning with scrolling');
      
      // Immediately send response that scan started (important to avoid connection errors)
      sendResponse({ success: true, status: 'scan_started' });
      
      // Process the scan asynchronously (we already responded to avoid connection errors)
      handleAutoScan(request.options);
      
      return true; // we've already sent the response
    }
    else if (request.action === 'showUnsupportedTabToast') {
      const message = request.message || "Please switch to a supported AI platform (Midjourney, DALL·E, etc) to use MainGallery.AI";
      showToast(message, 'error');
      sendResponse({ success: true });
      return true;
    }
  } catch (err) {
    handleError('contentScriptMessageHandler', err);
    sendResponse({ success: false, error: err.message });
  }
  
  return true; // Keep channel open for async response
});

// Send initial ready message for monitoring
logger.log('MainGallery.AI content script fully loaded and initialized');
notifyBackgroundScriptReady();
