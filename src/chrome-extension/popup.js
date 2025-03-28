// Brand configuration to align with the main app
const BRAND = {
  name: "MainGallery",
  urls: {
    baseUrl: "https://main-gallery-hub.lovable.app",
    auth: "/auth",
    gallery: "/gallery"
  }
};

// Gallery URL with base from brand config
const GALLERY_URL = `${BRAND.urls.baseUrl}${BRAND.urls.gallery}`;
const AUTH_URL = `${BRAND.urls.baseUrl}${BRAND.urls.auth}`;

// Platform detection patterns
const PLATFORMS = {
  midjourney: {
    name: 'Midjourney',
    icon: 'icons/midjourney.png',
    urlPatterns: [/midjourney\.com/, /discord\.com\/channels.*midjourney/],
    tokenStorageKey: 'midjourney_token',
    galleryPages: [/midjourney\.com\/organize/, /midjourney\.com\/archive/, /midjourney\.com\/feed/]
  },
  dalle: {
    name: 'DALL·E',
    icon: 'icons/dalle.png',
    urlPatterns: [/openai\.com/],
    tokenStorageKey: 'dalle_token',
    galleryPages: [/openai\.com\/create/, /openai\.com\/collection/]
  },
  stableDiffusion: {
    name: 'Stable Diffusion',
    icon: 'icons/stablediffusion.png',
    urlPatterns: [/dreamstudio\.ai/, /stability\.ai/],
    tokenStorageKey: 'sd_token',
    galleryPages: [/dreamstudio\.ai\/gallery/, /dreamstudio\.ai\/workspace/]
  },
  runway: {
    name: 'Runway',
    icon: 'icons/runway.png',
    urlPatterns: [/runwayml\.com/],
    tokenStorageKey: 'runway_token',
    galleryPages: [/runwayml\.com\/projects/, /runwayml\.com\/assets/]
  },
  pika: {
    name: 'Pika',
    icon: 'icons/pika.png',
    urlPatterns: [/pika\.art/],
    tokenStorageKey: 'pika_token',
    galleryPages: [/pika\.art\/profile/, /pika\.art\/videos/]
  },
  leonardo: {
    name: 'Leonardo.ai',
    icon: 'icons/leonardo.png',
    urlPatterns: [/leonardo\.ai/],
    tokenStorageKey: 'leonardo_token',
    galleryPages: [/leonardo\.ai\/gallery/, /leonardo\.ai\/generations/, /leonardo\.ai\/library/, /app\.leonardo\.ai/]
  }
};

// DOM elements
const states = {
  notLoggedIn: document.getElementById('not-logged-in'),
  loggedInMessage: document.getElementById('logged-in-message'),
  notPlatformPage: document.getElementById('not-platform-page'),
  notPlatformLoggedIn: document.getElementById('not-platform-logged-in'),
  readyToConnect: document.getElementById('ready-to-connect'),
  alreadyConnected: document.getElementById('already-connected'),
  connecting: document.getElementById('connecting'),
  authLoading: document.getElementById('auth-loading')
};

const loginBtn = document.getElementById('login-btn');
const googleLoginBtn = document.getElementById('google-login-btn');
const microsoftLoginBtn = document.getElementById('microsoft-login-btn');
const connectBtn = document.getElementById('connect-btn');
const viewGalleryBtn = document.getElementById('view-gallery-btn');
const viewMyGalleryBtn = document.getElementById('view-my-gallery-btn');

const platformNameElem = document.getElementById('platform-name');
const platformIconElem = document.getElementById('platform-icon');
const platformNameNotLoggedElem = document.getElementById('platform-name-not-logged');
const platformIconNotLoggedElem = document.getElementById('platform-icon-not-logged');
const connectedPlatformNameElem = document.getElementById('connected-platform-name');
const connectedPlatformIconElem = document.getElementById('connected-platform-icon');
const connectingPlatformNameElem = document.getElementById('connecting-platform-name');

// Helper functions
function hideAllStates() {
  Object.values(states).forEach(state => state.classList.add('hidden'));
}

function showState(state) {
  hideAllStates();
  state.classList.remove('hidden');
}

function detectPlatform(url) {
  for (const [id, platform] of Object.entries(PLATFORMS)) {
    for (const pattern of platform.urlPatterns) {
      if (pattern.test(url)) {
        return { id, ...platform };
      }
    }
  }
  return null;
}

function isGalleryPage(url, platformId) {
  const platform = PLATFORMS[platformId];
  if (!platform || !platform.galleryPages) return false;
  
  return platform.galleryPages.some(pattern => pattern.test(url));
}

function isPlatformLoggedIn(url, platformId) {
  // This is a simplified check - in production would need more robust detection
  if (platformId === 'midjourney') {
    return url.includes('midjourney.com') && !url.includes('login');
  }
  
  if (platformId === 'leonardo') {
    return url.includes('leonardo.ai') && !url.includes('login') && !url.includes('signup');
  }
  
  // Default case - assume logged in if not on login/signup pages
  return !url.includes('login') && !url.includes('signup');
}

function isConnected(platformId) {
  return new Promise(resolve => {
    chrome.storage.local.get([`platform_${platformId}_connected`], result => {
      resolve(!!result[`platform_${platformId}_connected`]);
    });
  });
}

function isLoggedIn() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['main_gallery_auth_token'], result => {
      resolve(!!result.main_gallery_auth_token);
    });
  });
}

// ENHANCED: Improved connect platform function with immediate redirect
async function connectPlatform(platform) {
  showState(states.connecting);
  connectingPlatformNameElem.textContent = platform.name;
  
  try {
    // Show the connecting state with the progress bar animation
    await new Promise(resolve => setTimeout(resolve, 1000)); // Reduced from 1500 to 1000ms for better UX
    
    // Mark platform as connected
    chrome.storage.local.set({ [`platform_${platform.id}_connected`]: true }, function() {
      console.log(`Platform ${platform.id} connection state saved: true`);
    });
    
    chrome.runtime.sendMessage({
      action: 'platformConnected',
      platform: platform.id
    });
    
    // Show connected status as a toast notification
    showToast(`✓ Connected to ${platform.name}`);
    
    // After connecting, open the gallery immediately without delay
    openGallery();
  } catch (error) {
    console.error('Error connecting platform:', error);
    showToast('Failed to connect. Please try again.');
    updateUI();
  }
}

// IMPROVED: Enhanced gallery opening function for better UX
async function openGallery() {
  try {
    // Send a message to the background script to handle opening the gallery
    chrome.runtime.sendMessage({ action: 'openGallery' });
    
    // Close the popup immediately after navigation request
    window.close();
  } catch (error) {
    console.error('Error opening gallery:', error);
    showToast('Could not open gallery. Please try again.');
  }
}

// Open auth page for specific provider
function openAuthWithProvider(provider) {
  try {
    showState(states.authLoading);
    
    // Store redirect path in session storage
    sessionStorage.setItem('oauth_redirect', '/gallery');
    
    chrome.runtime.sendMessage({
      action: 'openAuthWithProvider',
      provider: provider
    });
    
    // Close the popup after initiating OAuth
    setTimeout(() => window.close(), 500);
  } catch (error) {
    console.error(`Error opening ${provider} auth:`, error);
    showToast(`Could not open ${provider} login. Please try again.`);
    updateUI();
  }
}

// Show toast notification
function showToast(message) {
  // Remove any existing toasts
  const existingToast = document.querySelector('.main-gallery-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'main-gallery-toast';
  toast.textContent = message;
  
  // Add to document
  document.body.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Auto hide after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ENHANCED: Smarter UI update logic with autoredirect
async function updateUI() {
  console.log('Updating popup UI with enhanced logic');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab.url;
  
  const loggedIn = await isLoggedIn();
  
  if (!loggedIn) {
    // User is not logged in to MainGallery
    showState(states.notLoggedIn);
    return;
  }
  
  // ENHANCED Smart redirect condition #1: Already logged in
  // Immediately redirect to gallery if user is already logged in
  const hasConnectedPlatforms = await checkForAnyConnectedPlatforms();
  openGallery();
  return;
}

// Helper function to check if user has any connected platforms
async function checkForAnyConnectedPlatforms() {
  return new Promise(resolve => {
    chrome.storage.local.get(null, function(items) {
      const platformKeys = Object.keys(items).filter(key => 
        key.startsWith('platform_') && key.endsWith('_connected')
      );
      
      const hasConnected = platformKeys.some(key => items[key] === true);
      console.log('Connected platforms check:', hasConnected ? 'Has connected platforms' : 'No connected platforms');
      resolve(hasConnected);
    });
  });
}

// ENHANCED: On load - check for auto-redirect conditions
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup loaded - checking for auto-redirect conditions');
  
  try {
    const loggedIn = await isLoggedIn();
    
    if (loggedIn) {
      // AUTO-REDIRECT: If user is logged in to MainGallery, bypass popup entirely
      console.log('Auto-redirect condition met: User logged in, bypassing popup entirely');
      openGallery();
      return;
    }
    
    // If no auto-redirect occurred, update UI normally
    updateUI();
  } catch (error) {
    console.error('Error during auto-redirect check:', error);
    // Fall back to normal UI update
    updateUI();
  }
});

// Event listeners for buttons
loginBtn.addEventListener('click', () => {
  openAuthPage();
});

if (googleLoginBtn) {
  googleLoginBtn.addEventListener('click', () => {
    openAuthWithProvider('google');
  });
}

if (microsoftLoginBtn) {
  microsoftLoginBtn.addEventListener('click', () => {
    openAuthWithProvider('azure');
  });
}

connectBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const platform = detectPlatform(tab.url);
  if (platform) {
    connectPlatform(platform);
  }
});

viewGalleryBtn.addEventListener('click', () => {
  openGallery();
});

viewMyGalleryBtn.addEventListener('click', () => {
  openGallery();
});

// Add helper function for opening auth page
function openAuthPage() {
  chrome.runtime.sendMessage({ action: 'openAuthPage' });
  window.close();
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'updateUI') {
    updateUI();
  }
});
