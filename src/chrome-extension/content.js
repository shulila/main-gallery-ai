
// MainGallery Content Script
console.log('MainGallery content script loaded');

// Constants for platform detection
const PLATFORMS = {
  midjourney: {
    name: 'Midjourney',
    urlPatterns: [/midjourney\.com/, /discord\.com\/channels.*midjourney/],
    galleryPages: [/midjourney\.com\/organize/, /midjourney\.com\/archive/, /midjourney\.com\/feed/]
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
})();
