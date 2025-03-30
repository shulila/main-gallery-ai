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

// NEW FUNCTION: Extract Midjourney images from page
function extractMidjourneyImages() {
  console.log('Extracting Midjourney images from current page');
  
  try {
    // Check if we're on the Midjourney app page
    if (!window.location.href.includes('midjourney.com/app')) {
      console.log('Not on Midjourney app page, skipping extraction');
      return null;
    }
    
    // Wait a moment to ensure the page is fully loaded
    setTimeout(() => {
      // This is a POC implementation - actual selectors will need to be adjusted
      // based on the real DOM structure of Midjourney's web app
      
      // Collection to store extracted images
      const extractedImages = [];
      
      // Find all image containers on the page
      // These selectors are examples and will need to be updated based on actual DOM structure
      const imageContainers = document.querySelectorAll('.card, .image-container, .grid-item');
      
      console.log(`Found ${imageContainers.length} potential image containers`);
      
      // Process each container to extract information
      imageContainers.forEach((container, index) => {
        try {
          // Extract image URL (different sites may have different structures)
          const imageElement = container.querySelector('img, .image, [role="img"]');
          const imageUrl = imageElement ? (imageElement.src || imageElement.dataset.src) : null;
          
          // Extract prompt if available
          const promptElement = container.querySelector('.prompt, .description, .caption');
          const prompt = promptElement ? promptElement.textContent.trim() : null;
          
          // Extract date if available
          const dateElement = container.querySelector('.date, .timestamp, time');
          const createdAt = dateElement ? dateElement.textContent.trim() || dateElement.getAttribute('datetime') : null;
          
          // Extract any ID or link
          const linkElement = container.querySelector('a') || container;
          const linkUrl = linkElement.href || null;
          const id = linkUrl ? linkUrl.split('/').pop() : `mj-${Date.now()}-${index}`;
          
          if (imageUrl) {
            extractedImages.push({
              id,
              url: imageUrl,
              prompt,
              platform: 'midjourney',
              createdAt: createdAt || new Date().toISOString(),
              sourceUrl: linkUrl,
              extractedAt: new Date().toISOString()
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
      }
    }, 2000); // Give the page time to render fully
    
    return true;
  } catch (error) {
    console.error('Error extracting Midjourney images:', error);
    return null;
  }
}

// Store extracted images in Chrome storage
function storeExtractedImages(images) {
  // First get existing images to avoid duplicates
  chrome.storage.local.get(['midjourney_extracted_images'], function(result) {
    const existingImages = result.midjourney_extracted_images || [];
    const existingIds = new Set(existingImages.map(img => img.id));
    
    // Filter out duplicates
    const newImages = images.filter(img => !existingIds.has(img.id));
    
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

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
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
      
    case 'getMidjourneyDetails':
      // This will be implemented in the future for more detailed extraction
      sendResponse({ notImplemented: true });
      break;
  }
  
  return true; // Keep channel open for async response
});

// Initialize: inject script, notify background, and check UI conditions
(function initialize() {
  // Inject content script first
  injectContentScript();
  
  // Notify background script that content script has loaded
  chrome.runtime.sendMessage({ action: 'contentScriptLoaded' }, response => {
    if (response && response.success) {
      console.log(`MainGallery: ${response.message}`);
      
      if (response.platformId && response.userLoggedIn) {
        // If user is logged in and we're on a platform, check UI conditions
        if (isGalleryPage(response.platformId)) {
          chrome.storage.local.get([`platform_${response.platformId}_connected`], result => {
            const isConnected = !!result[`platform_${response.platformId}_connected`];
            
            if (!isConnected) {
              const platform = PLATFORMS[response.platformId];
              showConnectButton(response.platformId, platform.name);
            }
          });
        }
      }
    }
  });
  
  // Check UI conditions after a short delay to ensure DOM is fully loaded
  setTimeout(checkAndShowUI, 1500);
  
  // Re-check UI conditions when page visibility changes or after navigation
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
      checkAndShowUI();
    }
  });
  
  // Watch for page mutations that might indicate navigation within SPA
  const observer = new MutationObserver(function(mutations) {
    // Filter mutations to avoid too many checks
    const significantChanges = mutations.some(mutation => {
      return mutation.type === 'childList' && 
             (mutation.target === document.body || 
              mutation.target === document.getElementById('app') ||
              mutation.target === document.getElementById('root'));
    });
    
    if (significantChanges) {
      checkAndShowUI();
    }
  });
  
  // Observe the document for significant changes
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  
  // For Midjourney specifically, check if we're on the app page
  if (window.location.href.includes('midjourney.com/app')) {
    console.log('On Midjourney app page, will attempt to extract images');
    
    // Wait for page to fully load before extracting
    window.addEventListener('load', () => {
      setTimeout(extractMidjourneyImages, 3000);
    });
    
    // Also set up MutationObserver to detect when new images are loaded
    const observer = new MutationObserver(function(mutations) {
      const significantChanges = mutations.some(mutation => {
        return mutation.type === 'childList' && 
               mutation.addedNodes.length > 0;
      });
      
      if (significantChanges) {
        console.log('Detected new content in Midjourney app, extracting images');
        extractMidjourneyImages();
      }
    });
    
    // Start observing with a delay to ensure the page is ready
    setTimeout(() => {
      const targetNode = document.querySelector('.gallery, main, #root, #app') || document.body;
      observer.observe(targetNode, {
        childList: true,
        subtree: true
      });
      console.log('Observation started for new Midjourney content');
    }, 3000);
  }
})();
