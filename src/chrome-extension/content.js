// MainGallery Content Script
console.log('MainGallery content script loaded');

// Constants for platform detection
const PLATFORMS = {
  midjourney: {
    name: 'Midjourney',
    urlPatterns: [/midjourney\.com/, /discord\.com\/channels.*midjourney/],
    galleryPages: [/midjourney\.com\/organize/, /midjourney\.com\/archive/, /midjourney\.com\/feed/, /midjourney\.com\/app/]
  },
  dalle: {
    name: 'DALL·E',
    urlPatterns: [/openai\.com/],
    galleryPages: [/openai\.com\/create/, /openai\.com\/collection/]
  },
  stableDiffusion: {
    name: 'Stable Diffusion',
    urlPatterns: [/dreamstudio\.ai/, /stability\.ai/],
    galleryPages: [/dreamstudio\.ai\/gallery/, /dreamstudio\.ai\/workspace/]
  },
  runway: {
    name: 'Runway',
    urlPatterns: [/runwayml\.com/],
    galleryPages: [/runwayml\.com\/projects/, /runwayml\.com\/assets/]
  },
  pika: {
    name: 'Pika',
    urlPatterns: [/pika\.art/],
    galleryPages: [/pika\.art\/profile/, /pika\.art\/videos/]
  },
  leonardo: {
    name: 'Leonardo.ai',
    urlPatterns: [/leonardo\.ai/],
    galleryPages: [/leonardo\.ai\/gallery/, /leonardo\.ai\/generations/, /leonardo\.ai\/library/, /app\.leonardo\.ai/]
  }
};

// Check if current URL matches platform and page type
function detectPlatform() {
  const url = window.location.href;
  
  for (const [id, platform] of Object.entries(PLATFORMS)) {
    for (const pattern of platform.urlPatterns) {
      if (pattern.test(url)) {
        return { id, ...platform };
      }
    }
  }
  
  return null;
}

// Check if current URL is a gallery page
function isGalleryPage(platformId) {
  const url = window.location.href;
  const platform = PLATFORMS[platformId];
  
  if (!platform || !platform.galleryPages) return false;
  
  return platform.galleryPages.some(pattern => pattern.test(url));
}

// Check if user is logged in to the platform
function checkPlatformLoginStatus(platformId) {
  // This is a simplified version - in production would need more robust checks
  if (platformId === 'midjourney') {
    // Check for user avatar or name elements
    return document.querySelector('.userAvatar') !== null || 
           document.querySelector('.userName') !== null;
  }
  
  if (platformId === 'leonardo') {
    // Check for user profile elements
    return document.querySelector('.userProfile') !== null || 
           document.querySelector('.accountMenu') !== null;
  }
  
  // Default fallback - check for logout buttons or user profile elements
  return document.querySelector('a[href*="logout"]') !== null || 
         document.querySelector('button:contains("Sign Out")') !== null ||
         document.querySelector('.user-profile') !== null ||
         document.querySelector('.avatar') !== null;
}

// Inject floating button injection script
function injectContentScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('content-injection.js');
  script.onload = function() {
    // Script has loaded, now we can access the exported functions
    this.remove(); // Remove script element
    
    // Call the injectStyles function from the injection script
    window.mgContentInjection?.injectStyles();
  };
  
  (document.head || document.documentElement).appendChild(script);
}

// Handle showing the floating connect button
function showConnectButton(platformId, platformName) {
  // Inject the button via the injection script
  if (window.mgContentInjection) {
    window.mgContentInjection.createFloatingConnectButton(platformId, platformName);
  } else {
    // If injection script isn't loaded yet, try again after a delay
    setTimeout(() => {
      if (window.mgContentInjection) {
        window.mgContentInjection.createFloatingConnectButton(platformId, platformName);
      }
    }, 1000);
  }
}

// Update floating button state
function updateConnectButtonState(state, platformId) {
  if (window.mgContentInjection) {
    window.mgContentInjection.showFloatingButtonState(state, platformId);
  }
}

// Smart contextual platform detection and UI insertion
async function checkAndShowUI() {
  try {
    // First detect if we're on a supported platform
    const platform = detectPlatform();
    if (!platform) return;
    
    console.log(`MainGallery detected platform: ${platform.name}`);
    
    // Check if on gallery page
    const onGalleryPage = isGalleryPage(platform.id);
    if (!onGalleryPage) {
      console.log('Not on a gallery page, skipping UI insertion');
      return;
    }
    
    console.log('On gallery page, checking MainGallery login status...');
    
    // Check if user is logged in to MainGallery
    chrome.runtime.sendMessage({ action: 'checkLoginStatus' }, response => {
      if (!response || !response.isLoggedIn) {
        console.log('User not logged in to MainGallery, skipping UI insertion');
        return;
      }
      
      console.log('User logged in to MainGallery, checking platform connection...');
      
      // Check if platform is already connected
      chrome.storage.local.get([`platform_${platform.id}_connected`], result => {
        const isConnected = !!result[`platform_${platform.id}_connected`];
        
        if (isConnected) {
          console.log('Platform already connected, skipping UI insertion');
          return;
        }
        
        console.log('Platform not connected, checking platform login status...');
        
        // Check if user is logged in to the platform
        const isPlatformLoggedIn = checkPlatformLoginStatus(platform.id);
        
        if (!isPlatformLoggedIn) {
          console.log('User not logged in to platform, skipping UI insertion');
          return;
        }
        
        console.log('All conditions met: showing floating connect button');
        
        // Show floating connect button
        showConnectButton(platform.id, platform.name);
      });
    });
  } catch (error) {
    console.error('Error in checkAndShowUI:', error);
  }
}

// Throttle function to limit execution frequency
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Enhanced Midjourney image extraction with improved DOM selectors and de-duplication
function extractMidjourneyImages() {
  console.log('Extracting Midjourney images from current page');
  
  try {
    // Check if we're on the Midjourney app page
    if (!window.location.href.includes('midjourney.com/app')) {
      console.log('Not on Midjourney app page, skipping extraction');
      return null;
    }
    
    console.log('Starting Midjourney image extraction...');
    
    // Collection to store extracted images
    const extractedImages = [];
    
    // Find all image containers on the page
    // Enhanced selectors to work with Midjourney's DOM structure
    // Try multiple selector patterns to increase chances of finding images
    const imageContainers = [
      ...document.querySelectorAll('.card, .image-container, .grid-item, [role="img"]'), 
      ...document.querySelectorAll('img[srcset*="midjourney"]'),
      ...document.querySelectorAll('div[data-job-id]'),
      ...document.querySelectorAll('figure, [role="figure"]'),
      ...document.querySelectorAll('.gallery-item, .gallery-cell, .image-wrapper')
    ];
    
    console.log(`Found ${imageContainers.length} potential image containers`);
    
    // Use a Set to track processed image URLs and avoid duplicates
    const processedUrls = new Set();
    
    // Process each container to extract information
    imageContainers.forEach((container, index) => {
      try {
        // Extract image URL with more robust selection
        let imageElement = container.querySelector('img, [role="img"]');
        let imageUrl = null;
        
        if (imageElement) {
          imageUrl = imageElement.src || imageElement.srcset?.split(' ')[0] || imageElement.dataset?.src;
        } else if (container.tagName === 'IMG') {
          imageUrl = container.src || container.srcset?.split(' ')[0] || container.dataset?.src;
        } else {
          // Try to find background image
          const style = window.getComputedStyle(container);
          const bgImage = style.backgroundImage;
          if (bgImage && bgImage !== 'none') {
            imageUrl = bgImage.replace(/^url\(['"](.+)['"]\)$/, '$1');
          }
        }
        
        // Skip if no valid image URL or already processed
        if (!imageUrl || processedUrls.has(imageUrl)) return;
        processedUrls.add(imageUrl);
        
        // Find the job ID - try multiple ways
        let jobId = container.dataset?.jobId || 
                    container.getAttribute('id') || 
                    container.querySelector('[data-job-id]')?.dataset?.jobId;
                    
        // Extract prompt with improved selectors
        let promptElement = container.querySelector('.prompt, .caption, [data-prompt], .description');
        let prompt = null;
        
        if (promptElement) {
          prompt = promptElement.textContent.trim() || promptElement.dataset?.prompt;
        } else {
          // Check for title or alt text as fallback
          prompt = imageElement?.title || imageElement?.alt || container.title;
        }
        
        // Extract date with improved selectors
        let dateElement = container.querySelector('time, .date, .timestamp, [datetime]');
        let createdAt = null;
        
        if (dateElement) {
          createdAt = dateElement.datetime || dateElement.dateTime || dateElement.textContent.trim();
        }
        
        // Generate a unique ID
        const id = jobId || 
                  container.id || 
                  `mj-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
        
        // Ensure we have absolute URLs
        if (imageUrl && !imageUrl.startsWith('http')) {
          if (imageUrl.startsWith('//')) {
            imageUrl = 'https:' + imageUrl;
          } else if (imageUrl.startsWith('/')) {
            imageUrl = 'https://www.midjourney.com' + imageUrl;
          }
        }
        
        // Create image hash for deduplication
        const imageHash = btoa(imageUrl).substring(0, 24);
        
        if (imageUrl) {
          extractedImages.push({
            id,
            url: imageUrl,
            prompt,
            platform: 'midjourney',
            createdAt: createdAt || new Date().toISOString(),
            sourceUrl: window.location.href,
            extractedAt: new Date().toISOString(),
            imageHash
          });
        }
      } catch (err) {
        console.error('Error extracting data from container:', err);
      }
    });
    
    console.log(`Successfully extracted ${extractedImages.length} images from Midjourney`);
    
    if (extractedImages.length > 0) {
      // Store in local storage
      storeExtractedImages(extractedImages);
      
      // Notify about successful extraction
      chrome.runtime.sendMessage({
        action: 'midjourneyImagesExtracted',
        count: extractedImages.length
      });
      
      // Send images to background script for storage
      chrome.runtime.sendMessage({
        action: 'storeExtractedImages',
        images: extractedImages
      });
    }
    
    return extractedImages.length > 0;
  } catch (error) {
    console.error('Error extracting Midjourney images:', error);
    return false;
  }
}

// Throttled version of image extraction to avoid overloading
const throttledExtractImages = throttle(extractMidjourneyImages, 2000);

// Store extracted images with improved de-duplication
function storeExtractedImages(images) {
  // First get existing images to avoid duplicates
  chrome.storage.local.get(['midjourney_extracted_images'], function(result) {
    const existingImages = result.midjourney_extracted_images || [];
    
    // Create a map of existing image hashes for faster lookups
    const existingHashes = new Set();
    existingImages.forEach(img => {
      const hash = img.imageHash || btoa(img.url).substring(0, 24);
      existingHashes.add(hash);
    });
    
    // Filter out duplicates based on image hash
    const newImages = images.filter(img => {
      const hash = img.imageHash || btoa(img.url).substring(0, 24);
      return !existingHashes.has(hash);
    });
    
    // Combine and store (keep most recent at the start)
    const combinedImages = [...newImages, ...existingImages];
    
    // Store in chrome.storage.local
    chrome.storage.local.set({
      'midjourney_extracted_images': combinedImages
    }, function() {
      console.log(`Stored ${newImages.length} new images (${combinedImages.length} total)`);
    });
  });
}

// Simulate infinite scroll to load more content
function simulateInfiniteScroll() {
  return new Promise((resolve) => {
    const originalScrollHeight = document.body.scrollHeight;
    let scrollAttempts = 0;
    const maxScrollAttempts = 5;
    
    const scrollInterval = setInterval(() => {
      // Scroll down incrementally
      window.scrollTo(0, document.body.scrollHeight);
      
      // Check if more content has loaded
      setTimeout(() => {
        const newScrollHeight = document.body.scrollHeight;
        scrollAttempts++;
        
        if (
          newScrollHeight > originalScrollHeight || 
          scrollAttempts >= maxScrollAttempts
        ) {
          clearInterval(scrollInterval);
          console.log(`Scroll simulation completed after ${scrollAttempts} attempts`);
          resolve(newScrollHeight > originalScrollHeight);
        }
      }, 500);
    }, 1000);
  });
}

// Proactively load and extract more images
async function loadMoreAndExtract() {
  console.log('Attempting to load more content by scrolling...');
  
  // Simulate scrolling to trigger lazy loading
  const moreContentLoaded = await simulateInfiniteScroll();
  
  if (moreContentLoaded) {
    console.log('More content loaded, extracting new images...');
    // Wait a bit for any lazy-loaded images to fully render
    setTimeout(extractMidjourneyImages, 1000);
  } else {
    console.log('No more content loaded or reached scroll limit');
  }
}

// Initialize with automatic sync for Midjourney pages
(function initialize() {
  // Inject content script first
  injectContentScript();
  
  // Notify background script that content script has loaded
  chrome.runtime.sendMessage({ action: 'contentScriptLoaded' });
  
  // Check UI conditions after a short delay to ensure DOM is fully loaded
  setTimeout(checkAndShowUI, 1500);
  
  // Re-check UI conditions when page visibility changes
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
      checkAndShowUI();
      
      // Auto-sync images when page becomes visible
      if (window.location.href.includes('midjourney.com/app')) {
        extractMidjourneyImages();
      }
    }
  });
  
  // If on Midjourney app page, set up automatic extraction
  if (window.location.href.includes('midjourney.com/app')) {
    console.log('On Midjourney app page, setting up automatic extraction');
    
    // Initial extraction after page loads
    window.addEventListener('load', () => {
      // Wait for content to load
      setTimeout(() => {
        extractMidjourneyImages();
        
        // After initial extraction, try to load more content
        setTimeout(loadMoreAndExtract, 2000);
      }, 2000);
      
      // Set up MutationObserver to detect new content
      const targetNode = document.querySelector('.gallery, main, #root, #app') || document.body;
      
      // Configure the observer
      const observerConfig = {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src', 'srcset', 'data-src', 'data-job-id']
      };
      
      // Create an observer instance
      const observer = new MutationObserver((mutations) => {
        // Check if mutations include relevant changes
        const shouldExtract = mutations.some(mutation => {
          // New nodes added
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            return true;
          }
          
          // Relevant attribute changes
          if (mutation.type === 'attributes') {
            const target = mutation.target;
            return (
              target.tagName === 'IMG' || 
              target.classList?.contains('gallery-item') ||
              target.hasAttribute?.('data-job-id')
            );
          }
          
          return false;
        });
        
        if (shouldExtract) {
          // Use throttled extraction
          throttledExtractImages();
        }
      });
      
      // Start observing
      observer.observe(targetNode, observerConfig);
      console.log('MutationObserver set up to detect new Midjourney content');
      
      // Set up periodic extraction as a fallback
      setInterval(extractMidjourneyImages, 30000); // Every 30 seconds
    });
    
    // Set up scroll detection for extraction
    let lastScrollY = window.scrollY;
    let scrollTimeout;
    
    window.addEventListener('scroll', () => {
      // Clear previous timeout
      clearTimeout(scrollTimeout);
      
      // Set new timeout
      scrollTimeout = setTimeout(() => {
        // Only extract if significant scroll occurred
        if (Math.abs(window.scrollY - lastScrollY) > 300) {
          console.log('Significant scroll detected, extracting new images');
          extractMidjourneyImages();
          lastScrollY = window.scrollY;
        }
      }, 500);
    });
  }
})();

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message.action);
  
  switch (message.action) {
    case 'platformDetected':
      // Platform detected by background script
      console.log(`Background detected platform: ${message.platformId}, user logged in: ${message.userLoggedIn}`);
      
      if (message.userLoggedIn) {
        // Check if on gallery page and show UI as needed
        if (isGalleryPage(message.platformId)) {
          chrome.storage.local.get([`platform_${message.platformId}_connected`], result => {
            const isConnected = !!result[`platform_${message.platformId}_connected`];
            
            if (!isConnected) {
              const platform = PLATFORMS[message.platformId];
              showConnectButton(message.platformId, platform.name);
            }
          });
        }
      }
      
      sendResponse({ success: true });
      break;
      
    case 'checkPlatformLogin':
      // Check if user is logged in to platform
      const isLoggedIn = checkPlatformLoginStatus(message.platformId);
      sendResponse({ isLoggedIn });
      break;
      
    case 'isGalleryPage':
      // Check if current page is a gallery page
      const isGallery = isGalleryPage(message.platformId);
      sendResponse({ isGalleryPage: isGallery });
      break;
      
    case 'showConnectButton':
      // Show floating connect button
      const platform = PLATFORMS[message.platformId];
      if (platform && isGalleryPage(message.platformId)) {
        showConnectButton(message.platformId, platform.name);
      }
      sendResponse({ success: true });
      break;
      
    case 'platformConnected':
      // Update button to connected state
      updateConnectButtonState('connected', message.platformId);
      sendResponse({ success: true });
      break;
      
    case 'platformDisconnected':
      // Update UI after platform disconnected
      checkAndShowUI(); // Re-check conditions and show button if needed
      sendResponse({ success: true });
      break;
      
    case 'authStateChanged':
      // User logged in or out of MainGallery
      if (message.isLoggedIn) {
        checkAndShowUI(); // Check and show UI if conditions are met
      }
      sendResponse({ success: true });
      break;
      
    case 'extractMidjourneyImages':
      const result = extractMidjourneyImages();
      sendResponse({ success: !!result });
      break;
      
    case 'loadMoreContent':
      loadMoreAndExtract().then(result => {
        sendResponse({ success: result });
      });
      return true; // Will respond asynchronously
      
    case 'getMidjourneyDetails':
      // This will be implemented in the future for more detailed extraction
      sendResponse({ notImplemented: true });
      break;
  }
  
  return true; // Keep channel open for async response
});
