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
  { pattern: /www\.genspark\.ai\/me/, name: "GenSpark" }
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
    
    // Inject CSS if not already present
    if (!document.getElementById('maingallery-toast-styles')) {
      const style = document.createElement('style');
      style.id = 'maingallery-toast-styles';
      style.textContent = `
        .maingallery-toast {
          position: fixed;
          bottom: 20px;
          right: 20px;
          padding: 10px 15px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          border-radius: 4px;
          z-index: 9999;
          max-width: 300px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          display: flex;
          align-items: center;
          justify-content: space-between;
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.3s, transform 0.3s;
        }
        .maingallery-toast.show {
          opacity: 1;
          transform: translateY(0);
        }
        .maingallery-toast-info {
          border-left: 4px solid #3498db;
        }
        .maingallery-toast-success {
          border-left: 4px solid #2ecc71;
        }
        .maingallery-toast-error {
          border-left: 4px solid #e74c3c;
        }
        .maingallery-toast button {
          background: transparent;
          border: none;
          color: white;
          font-size: 16px;
          cursor: pointer;
          margin-left: 10px;
          opacity: 0.7;
        }
        .maingallery-toast button:hover {
          opacity: 1;
        }
      `;
      document.head.appendChild(style);
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

// Ensure content script can respond to ping messages
function setupPingHandler() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle ping messages to verify content script is loaded
    if (message.type === "PING") {
      sendResponse({ success: true, status: "content_script_ready" });
      return true;
    }
    return false; // Let other listeners handle other message types
  });
  
  logger.log("Ping handler registered");
}

// Set up message listeners and notify background script that content script is loaded
function setupMessageListeners() {
  logger.log("Setting up message listeners for content script");
  
  // Handle messages from the background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    logger.log("Message received in content script:", message);
    
    try {
      // Handle different message types
      if (message.type === "PING") {
        // Already handled by the ping handler
        return false;
      }
      else if (message.action === "startAutoScan") {
        logger.log("Starting auto-scan of the page");
        
        // Extract scan options
        const options = message.options || {};
        
        // Start the scanning process
        startScanning(options)
          .then(result => {
            logger.log("Scan completed with results:", result);
            sendResponse({ success: true, result });
          })
          .catch(err => {
            handleError("autoScan", err);
            sendResponse({ success: false, error: err.message });
          });
        
        return true; // Keep message channel open for async response
      }
      
      // Default response
      sendResponse({ success: false, error: "Unhandled message type" });
    } catch (err) {
      handleError("messageHandler", err);
      sendResponse({ success: false, error: err.message });
    }
    
    return true; // Keep message channel open for async response
  });
  
  // Notify the background script that the content script is loaded
  try {
    chrome.runtime.sendMessage({
      action: "CONTENT_SCRIPT_READY",
      location: window.location.href,
      timestamp: Date.now()
    }, response => {
      if (chrome.runtime.lastError) {
        logger.warn("Could not notify background script: ", chrome.runtime.lastError.message);
      } else {
        logger.log("Background script notified of content script loading");
      }
    });
  } catch (err) {
    handleError("notifyBackgroundScript", err, { silent: true });
  }
}

// Main scanning functionality
async function startScanning(options = {}) {
  const { scrollDelay = 300, scrollStep = 500, maxScroll = 30 } = options;
  
  logger.log("Starting scan with options:", options);
  showToast("MainGallery.AI is scanning this page for AI images...", "info");
  
  try {
    // Scroll the page to load all content
    await autoScrollToBottom({ scrollDelay, scrollStep, maxScroll });
    
    // Extract images from the page
    const images = await extractImagesFromPage();
    
    // If images were found, send them to background
    if (images && images.length > 0) {
      logger.log("Found", images.length, "images on the page");
      showToast(`Found ${images.length} AI images! Adding to your gallery...`, "success");
      
      // Send images to background script
      try {
        chrome.runtime.sendMessage({
          action: "scanComplete",
          images: images,
          location: window.location.href,
          platform: getPlatformNameFromUrl(window.location.href),
          timestamp: Date.now()
        }, response => {
          if (chrome.runtime.lastError) {
            logger.error("Error sending images to background:", chrome.runtime.lastError.message);
            showToast("Error syncing images. Please try again.", "error");
          } else {
            logger.log("Images sent to background script successfully");
            showToast("Images added to your gallery!", "success");
          }
        });
      } catch (err) {
        handleError("sendImagesToBackground", err);
        showToast("Error syncing images. Please try again.", "error");
      }
      
      return { success: true, count: images.length };
    } else {
      logger.log("No images found on the page");
      showToast("No AI images found on this page.", "info");
      return { success: true, count: 0 };
    }
  } catch (err) {
    handleError("startScanning", err);
    showToast("Error scanning the page. Please try again.", "error");
    return { success: false, error: err.message };
  }
}

// Implement the auto scroll function that was referenced earlier
async function autoScrollToBottom(options = {}) {
  const { scrollDelay = 300, scrollStep = 500, maxScroll = 30 } = options;
  
  return new Promise((resolve) => {
    let scrollCount = 0;
    let lastScrollY = window.scrollY;
    let samePositionCount = 0;
    
    const scrollInterval = setInterval(() => {
      window.scrollBy(0, scrollStep);
      scrollCount++;
      
      // Check if we're at the bottom or haven't moved
      if (window.scrollY === lastScrollY) {
        samePositionCount++;
      } else {
        samePositionCount = 0;
      }
      
      lastScrollY = window.scrollY;
      
      // Stop if:
      // 1. We've scrolled enough times
      // 2. We're near the bottom of the page
      // 3. We haven't moved in a few attempts
      if (scrollCount >= maxScroll || 
          (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 200 ||
          samePositionCount >= 3) {
        clearInterval(scrollInterval);
        
        // Scroll back to top
        window.scrollTo(0, 0);
        
        // Wait a bit for any lazy-loaded content to appear
        setTimeout(resolve, 500);
      }
    }, scrollDelay);
  });
}

// Function to extract images from the page
async function extractImagesFromPage() {
  logger.log("Extracting images from page");
  
  try {
    // Get all image elements on the page
    const imgElements = Array.from(document.querySelectorAll('img'));
    
    // Filter and process images
    const platformName = getPlatformNameFromUrl(window.location.href);
    
    // Basic extraction (this would be more complex in the real extension)
    const extractedImages = imgElements
      .filter(img => {
        // Filter by size (ignore tiny images)
        return img.naturalWidth > 200 && img.naturalHeight > 200;
      })
      .map((img, index) => {
        // Get image information
        const src = img.src;
        const alt = img.alt || '';
        const title = img.title || '';
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        
        // Extract any prompt data from the image or surrounding elements
        let prompt = alt || title;
        
        // Try to find prompt in parent elements
        let currentEl = img.parentElement;
        for (let i = 0; i < 3 && currentEl && !prompt; i++) {
          const textContent = currentEl.textContent?.trim();
          if (textContent && textContent.length > 10 && textContent.length < 1000) {
            prompt = textContent;
          }
          currentEl = currentEl.parentElement;
        }
        
        // Create timestamp (now or use data attribute if available)
        const timestamp = img.dataset.timestamp ? parseInt(img.dataset.timestamp) : Date.now();
        
        // Return image data
        return {
          id: `${platformName}_${timestamp}_${index}`,
          url: src,
          thumbnail: src,
          prompt: prompt || 'No prompt available',
          platform: platformName,
          width,
          height,
          timestamp,
          createdAt: new Date(timestamp).toISOString(),
          sourceUrl: window.location.href
        };
      });
    
    // Ensure chronological ordering
    return extractedImages.sort((a, b) => b.timestamp - a.timestamp);
  } catch (err) {
    handleError("extractImagesFromPage", err);
    return [];
  }
}

// Initialize the content script
function initialize() {
  logger.log("Initializing content script on:", window.location.href);
  
  // Check if we're on a supported platform
  const isSupportedSite = isSupportedPlatformUrl(window.location.href);
  
  if (isSupportedSite) {
    logger.log("Running on supported platform:", getPlatformNameFromUrl(window.location.href));
    
    // Set up ping handler first
    setupPingHandler();
    
    // Set up message listeners
    setupMessageListeners();
    
    // Additional initialization can go here
  } else {
    logger.log("Not a supported platform, content script in passive mode");
  }
}

// Start the content script
initialize();
