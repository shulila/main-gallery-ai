
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

// APPROVED PLATFORM PATTERNS
const APPROVED_PLATFORMS = [
  // Midjourney
  { pattern: /www\.midjourney\.com\/imagine/, name: "Midjourney" },
  { pattern: /www\.midjourney\.com\/archive/, name: "Midjourney" },
  // Leonardo AI
  { pattern: /app\.leonardo\.ai\/library/, name: "Leonardo AI" },
  // Runway
  { pattern: /app\.runwayml\.com/, name: "Runway ML" },
  // Pika
  { pattern: /pika\.art\/my-library/, name: "Pika" },
  // Freepik
  { pattern: /www\.freepik\.com\/pikaso\/projects/, name: "Freepik Pikaso" },
  // Kling AI
  { pattern: /app\.klingai\.com\/global\/user-assets\/materials/, name: "Kling AI" },
  // Luma
  { pattern: /dream-machine\.lumalabs\.ai\/ideas/, name: "Luma" },
  // Krea
  { pattern: /www\.krea\.ai\/assets/, name: "Krea" },
  // Hailuo
  { pattern: /hailuoai\.video\/mine/, name: "Hailuo AI" },
  // Sora
  { pattern: /sora\.com\/library/, name: "Sora" },
  // LTX Studio
  { pattern: /app\.ltx\.studio\/media-manager/, name: "LTX Studio" },
  // Adobe Firefly
  { pattern: /firefly\.adobe\.com\/files\?tab=generationHistory/, name: "Adobe Firefly" },
  // FluxLabs
  { pattern: /www\.fluxlabs\.ai\/creations/, name: "FluxLabs" },
  // D-ID
  { pattern: /studio\.d-id\.com\/video-studio/, name: "D-ID" },
  // HeyGen
  { pattern: /app\.heygen\.com\/projects/, name: "HeyGen" },
  // Reve
  { pattern: /preview\.reve\.art\/app/, name: "Reve" },
  // Lexica
  { pattern: /lexica\.art\/history/, name: "Lexica" },
  // NightCafe
  { pattern: /creator\.nightcafe\.studio\/my-creations/, name: "NightCafe" },
  // Looka
  { pattern: /looka\.com\/dashboard/, name: "Looka" },
  // Reroom
  { pattern: /reroom\.ai\/account\/history/, name: "Reroom AI" },
  // Genmo
  { pattern: /www\.genmo\.ai\/play\/creations/, name: "Genmo" },
  // Botika
  { pattern: /app\.botika\.io\//, name: "Botika" },
  // Playground
  { pattern: /playground\.com\/design\/my-designs/, name: "Playground" },
  // Dream AI
  { pattern: /dream\.ai\/profile/, name: "Dream AI" },
  // Pixverse
  { pattern: /app\.pixverse\.ai\/asset\/video/, name: "Pixverse" },
  { pattern: /app\.pixverse\.ai\/asset\/album/, name: "Pixverse" },
  { pattern: /app\.pixverse\.ai\/asset\/character/, name: "Pixverse" },
  // Craiyon
  { pattern: /www\.craiyon\.com\/user\/account\/history/, name: "Craiyon" },
  // StarryAI
  { pattern: /starryai\.com\/app\/my-creations/, name: "StarryAI" },
  // Fotor
  { pattern: /www\.fotor\.com\/cloud\/all-creations\//, name: "Fotor" },
  { pattern: /www\.fotor\.com\/cloud\/all-projects\//, name: "Fotor" },
  // DeviantArt
  { pattern: /www\.deviantart\.com\/dreamup/, name: "DeviantArt DreamUp" },
  // DeepAI
  { pattern: /deepai\.org\/dashboard\/images/, name: "DeepAI" },
  { pattern: /deepai\.org\/dashboard\/videos/, name: "DeepAI" },
  { pattern: /deepai\.org\/dashboard\/characters/, name: "DeepAI" },
  // Elai
  { pattern: /app\.elai\.io\/videos/, name: "Elai" },
  // RunDiffusion
  { pattern: /app\.rundiffusion\.com\/runnit\/library/, name: "RunDiffusion" },
  // Neural Love
  { pattern: /neural\.love\/orders/, name: "Neural Love" },
  // Vidu
  { pattern: /www\.vidu\.com\/mycreations/, name: "Vidu" },
  // Prome AI
  { pattern: /www\.promeai\.pro\/profile/, name: "Prome AI" },
  { pattern: /www\.promeai\.pro\/userAssets/, name: "Prome AI" },
  // GenSpark
  { pattern: /www\.genspark\.ai\/me/, name: "GenSpark" },
  // DreamStudio
  { pattern: /dreamstudio\.ai/, name: "DreamStudio" }
];

// URL Utilities
function isSupportedPlatformUrl(url) {
  if (!url) return false;
  
  try {
    return APPROVED_PLATFORMS.some(platform => platform.pattern.test(url));
  } catch (err) {
    handleError('isSupportedPlatformUrl', err, { silent: true });
    return false;
  }
}

function getPlatformNameFromUrl(url) {
  if (!url) return "Unknown Platform";
  
  try {
    const matchedPlatform = APPROVED_PLATFORMS.find(platform => platform.pattern.test(url));
    return matchedPlatform ? matchedPlatform.name : "Unknown Platform";
  } catch (err) {
    handleError('getPlatformNameFromUrl', err, { silent: true });
    return "Unknown Platform";
  }
}

// DOM Utilities
function showToast(message, type = 'info') {
  try {
    // Remove existing toast if present
    const existingToast = document.querySelector('.maingallery-toast');
    if (existingToast) {
      existingToast.remove();
    }
    
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

// Image Extraction
function extractImages() {
  try {
    // First check if we're even on a supported platform
    const currentUrl = window.location.href;
    if (!isSupportedPlatformUrl(currentUrl)) {
      logger.warn('Not on a supported platform URL:', currentUrl);
      return { 
        images: [], 
        success: false, 
        error: 'Not a supported platform gallery page',
        url: currentUrl 
      };
    }
    
    logger.log(`Scanning for images on supported platform: ${getPlatformNameFromUrl(currentUrl)}`);
    
    const images = [];
    const seenUrls = new Set();
    const platformName = getPlatformNameFromUrl(window.location.href);
    
    // Find all images on the page
    const imgElements = document.querySelectorAll('img[src]:not([src^="data:"]):not([src^="blob:"])');
    
    logger.log(`Found ${imgElements.length} potential image elements`);
    
    imgElements.forEach(img => {
      try {
        const src = img.src;
        if (!src || seenUrls.has(src)) return;
        
        // Skip very small images (likely icons or thumbnails)
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        
        if (width < 150 || height < 150) {
          logger.log(`Skipping small image: ${width}x${height}`);
          return;
        }
        
        // Skip certain icon patterns
        if (src.includes('favicon') || 
            src.includes('/icons/') || 
            src.includes('/logo')) {
          logger.log(`Skipping icon/logo: ${src}`);
          return;
        }
        
        // Try to extract alt text, title, or nearby text as potential prompt
        let prompt = '';
        let title = '';
        
        // Check for alt or title attributes
        if (img.alt && img.alt.length > 5) {
          prompt = img.alt;
        } else if (img.title && img.title.length > 5) {
          title = img.title;
        }
        
        // Look for nearby text that might be a prompt
        if (!prompt) {
          // Try to find parent container
          const parent = img.closest('div') || img.parentElement;
          if (parent) {
            // Look for nearby text elements
            const textElements = parent.querySelectorAll('p, h1, h2, h3, h4, h5, span, div');
            for (const el of textElements) {
              const text = el.textContent?.trim();
              if (text && text.length > 10 && text.length < 1000) {
                prompt = text;
                break;
              }
            }
          }
        }
        
        // Determine file type from extension or MIME type
        let type = 'image';
        if (src.endsWith('.png')) type = 'png';
        else if (src.endsWith('.jpg') || src.endsWith('.jpeg')) type = 'jpeg';
        else if (src.endsWith('.webp')) type = 'webp';
        else if (src.endsWith('.gif')) type = 'gif';
        
        // Generate a created date timestamp (current if not available)
        const now = new Date();
        const createdAt = now.toISOString();
        
        // Collect necessary metadata
        const imageData = {
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          url: src,
          width,
          height,
          alt: img.alt || '',
          title: title || img.title || '',
          prompt: prompt || '',
          platform: platformName.toLowerCase().replace(/\s+/g, '_'),
          platformName,
          sourceURL: window.location.href,
          tabUrl: window.location.href,
          timestamp: Date.now(),
          createdAt,
          pageTitle: document.title || '',
          type,
          fromSupportedDomain: true
        };
        
        // Add to our collection and mark as seen
        images.push(imageData);
        seenUrls.add(src);
      } catch (imgErr) {
        // Silently handle individual image errors
        logger.error('Error processing image:', imgErr);
      }
    });
    
    logger.log(`Successfully extracted ${images.length} images from the page`);
    
    return { 
      images, 
      success: images.length > 0, 
      count: images.length,
      platform: getPlatformNameFromUrl(window.location.href)
    };
  } catch (err) {
    handleError('extractImages', err);
    return { 
      images: [], 
      success: false, 
      error: err.message,
      url: window.location.href 
    };
  }
}

// Message the background script when content script loads
function notifyBackgroundScriptReady() {
  try {
    chrome.runtime.sendMessage({ 
      action: 'CONTENT_SCRIPT_READY',
      location: window.location.href,
      platform: getPlatformNameFromUrl(window.location.href),
      isSupported: isSupportedPlatformUrl(window.location.href)
    });
  } catch (err) {
    handleError('notifyBackgroundScriptReady', err);
  }
}

// Handle auto-scanning functionality
async function handleAutoScan(options = {}) {
  try {
    const currentUrl = window.location.href;
    if (!isSupportedPlatformUrl(currentUrl)) {
      logger.log('Not a supported platform, showing notification');
      showToast('This site is not in the approved platform list for MainGallery', 'error');
      return { 
        success: false, 
        reason: 'unsupported_site',
        url: currentUrl 
      };
    }
    
    const platformName = getPlatformNameFromUrl(currentUrl);
    logger.log(`Starting auto-scan on ${platformName}`);
    
    // Show scanning toast
    showToast(`Scanning ${platformName} for AI-generated images...`, 'info');
    
    // Start the auto-scan process
    try {
      // Auto-scroll to the bottom of the page to reveal more images
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
        platform: platformName,
        success: images.length > 0,
        count: images.length,
        url: currentUrl
      }).catch(err => {
        handleError('sendScanResults', err);
        showToast('Error syncing images to gallery', 'error');
      });
      
      return { 
        success: true, 
        imageCount: images.length,
        platform: platformName
      };
    } catch (err) {
      handleError('autoScanProcess', err);
      showToast('Error during page scanning', 'error');
      
      // Notify background script about failure
      try {
        chrome.runtime.sendMessage({
          action: 'scanComplete',
          images: [],
          success: false,
          error: err.message,
          url: currentUrl
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
const currentUrl = window.location.href;
const isSupportedURL = isSupportedPlatformUrl(currentUrl);

if (isSupportedURL) {
  const platformName = getPlatformNameFromUrl(currentUrl);
  logger.log(`MainGallery.AI running on supported platform: ${platformName}`);
  
  // Set up mutation observer for dynamic content
  setupMutationObserver((mutations, hasNewImages) => {
    if (hasNewImages) {
      logger.log('Detected new images added to DOM');
    }
  });
  
  // Send ready message to background script with platform info
  notifyBackgroundScriptReady();
} else {
  logger.log('MainGallery.AI not running on unsupported site:', window.location.hostname);
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  logger.log('Content script received message:', request?.action);
  
  try {
    // Always respond to ping requests to establish connection
    if (request.action === 'ping' || request.action === 'PING') {
      logger.log('Received ping, responding with pong');
      sendResponse({ 
        success: true, 
        action: 'pong', 
        from: 'content_script',
        platform: getPlatformNameFromUrl(window.location.href),
        isSupported: isSupportedPlatformUrl(window.location.href)
      });
      return true;
    }
    
    if (request.action === 'extractImages') {
      if (!isSupportedPlatformUrl(window.location.href)) {
        logger.warn('Attempted to extract images from unsupported platform');
        sendResponse({ 
          images: [], 
          success: false, 
          reason: 'unsupported_site',
          url: window.location.href 
        });
        return true;
      }
      
      const result = extractImages();
      sendResponse(result);
      return true;
    } 
    else if (request.action === 'startAutoScan') {
      logger.log('Starting auto-scanning with scrolling');
      
      // Immediately send response that scan started (important to avoid connection errors)
      sendResponse({ 
        success: true, 
        status: 'scan_started',
        isSupported: isSupportedPlatformUrl(window.location.href),
        platform: getPlatformNameFromUrl(window.location.href) 
      });
      
      // Process the scan asynchronously (we already responded to avoid connection errors)
      handleAutoScan(request.options);
      
      return true; // we've already sent the response
    }
    else if (request.action === 'showUnsupportedTabToast') {
      const message = request.message || "Please switch to a supported AI platform to use MainGallery.AI";
      showToast(message, 'error');
      sendResponse({ success: true });
      return true;
    }
    else if (request.action === 'getPlatformInfo') {
      sendResponse({
        success: true,
        isSupported: isSupportedPlatformUrl(window.location.href),
        platform: getPlatformNameFromUrl(window.location.href),
        url: window.location.href
      });
      return true;
    }
  } catch (err) {
    handleError('contentScriptMessageHandler', err);
    sendResponse({ 
      success: false, 
      error: err.message,
      action: request?.action || 'unknown' 
    });
  }
  
  return true; // Keep channel open for async response
});

// Send initial ready message for monitoring
logger.log('MainGallery.AI content script fully loaded and initialized');
notifyBackgroundScriptReady();
