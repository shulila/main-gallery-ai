
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
    tokenStorageKey: 'midjourney_token'
  },
  dalle: {
    name: 'DALL·E',
    icon: 'icons/dalle.png',
    urlPatterns: [/openai\.com/],
    tokenStorageKey: 'dalle_token'
  },
  stableDiffusion: {
    name: 'Stable Diffusion',
    icon: 'icons/stablediffusion.png',
    urlPatterns: [/dreamstudio\.ai/, /stability\.ai/],
    tokenStorageKey: 'sd_token'
  },
  runway: {
    name: 'Runway',
    icon: 'icons/runway.png',
    urlPatterns: [/runwayml\.com/],
    tokenStorageKey: 'runway_token'
  },
  pika: {
    name: 'Pika',
    icon: 'icons/pika.png',
    urlPatterns: [/pika\.art/],
    tokenStorageKey: 'pika_token'
  },
  leonardo: {
    name: 'Leonardo.ai',
    icon: 'icons/leonardo.png',
    urlPatterns: [/leonardo\.ai/],
    tokenStorageKey: 'leonardo_token'
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
const connectBtn = document.getElementById('connect-btn');
const viewGalleryBtn = document.getElementById('view-gallery-btn');
const viewMyGalleryBtns = document.querySelectorAll('.view-my-gallery-btn, #view-my-gallery-btn2');
const firstTimeTip = document.getElementById('first-time-tip');
const pinExtensionTip = document.getElementById('pin-extension-tip');
const closeTipBtns = document.querySelectorAll('.close-tip');

const platformNameElem = document.getElementById('platform-name');
const platformIconElem = document.getElementById('platform-icon');
const platformNameNotLoggedElem = document.getElementById('platform-name-not-logged');
const platformIconNotLoggedElem = document.getElementById('platform-icon-not-logged');
const connectedPlatformNameElem = document.getElementById('connected-platform-name');
const connectedPlatformIconElem = document.getElementById('connected-platform-icon');
const connectingPlatformNameElem = document.getElementById('connecting-platform-name');

// OAuth login buttons
const googleLoginBtn = document.getElementById('google-login-btn');
const facebookLoginBtn = document.getElementById('facebook-login-btn');

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

function isPlatformLoggedIn(url, platformId) {
  // This is a placeholder. In a real-world scenario, you would have more
  // sophisticated checks based on DOM elements or API calls to verify login state
  
  // For Midjourney, check for specific DOM elements that indicate login
  if (platformId === 'midjourney') {
    // Simplified check - in a real implementation, you would send a message
    // to the content script to check for user-specific elements
    return url.includes('discord.com/channels') && !url.includes('login');
  }
  
  // For Leonardo, check for specific paths that indicate login
  if (platformId === 'leonardo') {
    return !url.includes('/login') && !url.includes('/signup');
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

async function connectPlatform(platform) {
  showState(states.connecting);
  connectingPlatformNameElem.textContent = platform.name;
  
  try {
    // Show the connecting state with the progress bar animation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // In a production environment, this would make a real API call
    // to connect the user's platform account
    
    // Mark platform as connected
    chrome.storage.local.set({ [`platform_${platform.id}_connected`]: true }, function() {
      console.log(`Platform ${platform.id} connection state saved: true`);
    });
    
    chrome.runtime.sendMessage({
      action: 'platformConnected',
      platform: platform.id
    });
    
    // Show connected status as a small badge/notification
    showToast(`✓ Connected to ${platform.name}`);
    
    // Update UI to show the connect status
    updateUI();
  } catch (error) {
    console.error('Error connecting platform:', error);
    showToast('Failed to connect. Please try again.');
    updateUI();
  }
}

async function disconnectPlatform(platform) {
  try {
    // Add a slight delay to show the processing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mark platform as disconnected
    chrome.storage.local.set({ [`platform_${platform.id}_connected`]: false }, function() {
      console.log(`Platform ${platform.id} connection state saved: false`);
    });
    
    chrome.runtime.sendMessage({
      action: 'platformDisconnected',
      platform: platform.id
    });
    
    showToast(`✓ Disconnected from ${platform.name}`);
    updateUI();
  } catch (error) {
    console.error('Error disconnecting platform:', error);
    showToast('Failed to disconnect. Please try again.');
  }
}

async function openGallery() {
  try {
    // Send a message to the background script to handle opening the gallery
    chrome.runtime.sendMessage({ action: 'openGallery' });
    
    // Close the popup after navigating
    window.close();
  } catch (error) {
    console.error('Error opening gallery:', error);
  }
}

function getAuthUrlWithRedirect(currentUrl) {
  if (!currentUrl) return `${AUTH_URL}?from=extension`;
  
  // Set from=extension param to trigger the appropriate flow
  const params = new URLSearchParams();
  params.set('from', 'extension');
  
  // Add redirect if provided
  if (currentUrl) {
    params.set('redirect', currentUrl);
  }
  
  return `${AUTH_URL}?${params.toString()}`;
}

async function openAuthPage() {
  try {
    // Show loading state
    showState(states.authLoading);
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let redirectUrl = '';
    
    if (tab && tab.url) {
      redirectUrl = tab.url;
    }
    
    // Send a message to the background script to handle opening the auth page
    chrome.runtime.sendMessage({ 
      action: 'openAuthPage',
      redirectUrl: redirectUrl
    });
    
    // Add a timeout to close the popup
    setTimeout(() => {
      window.close();
    }, 1000);
  } catch (error) {
    console.error('Error opening auth page:', error);
    
    // If there's an error, go back to not logged in state
    showState(states.notLoggedIn);
    
    // Show error toast
    showToast('Error starting login process. Please try again.');
  }
}

function handleTipClose(tipElement) {
  if (!tipElement) return;
  
  // Animate out before hiding
  tipElement.style.animation = 'fadeOut 0.3s forwards';
  
  setTimeout(() => {
    tipElement.classList.add('hidden');
    
    // Remember that we've closed this tip
    const tipId = tipElement.id;
    chrome.storage.local.set({ [`${tipId}_closed`]: true });
  }, 300);
}

function checkTipsVisibility() {
  chrome.storage.local.get(['first-time-tip_closed', 'pin-extension-tip_closed', 'popup_opened_before', 'main_gallery_auth_token'], function(result) {
    // Only show the first-time tip if not closed before and user is not logged in
    if (!result.popup_opened_before && !result['first-time-tip_closed'] && !result.main_gallery_auth_token) {
      if (firstTimeTip) {
        firstTimeTip.classList.remove('hidden');
      }
    }
    
    // Show the pin extension tip only if not closed before
    if (!result['pin-extension-tip_closed'] && pinExtensionTip) {
      chrome.storage.local.get(['pin_prompt_shown'], function(pinResult) {
        if (!pinResult.pin_prompt_shown) {
          pinExtensionTip.classList.remove('hidden');
          promptPinExtension();
          chrome.storage.local.set({ pin_prompt_shown: true });
        }
      });
    }
    
    // Record that the popup has been opened
    if (!result.popup_opened_before) {
      chrome.storage.local.set({ popup_opened_before: true });
    }
  });
}

// Function to prompt user to pin the extension
function promptPinExtension() {
  chrome.storage.local.get(['pin_prompt_shown'], function(result) {
    if (!result.pin_prompt_shown && pinExtensionTip) {
      pinExtensionTip.classList.remove('hidden');
      
      // Also show a toast notification
      showToast('📌 Tip: Pin this extension for quick access');
      
      // Mark as shown
      chrome.storage.local.set({ pin_prompt_shown: true });
    }
  });
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

async function updateUI() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab.url;
  
  const loggedIn = await isLoggedIn();
  
  if (!loggedIn) {
    // User is not logged in to MainGallery
    showState(states.notLoggedIn);
    checkTipsVisibility();
    return;
  }
  
  // User is logged in to MainGallery
  const platform = detectPlatform(url);
  
  if (!platform) {
    // Show logged in message briefly
    states.loggedInMessage.classList.remove('hidden');
    
    setTimeout(() => {
      // Then show not platform page
      showState(states.notPlatformPage);
    }, 1000);
    return;
  }
  
  // Check if the user is logged in to the platform
  const platformLoggedIn = isPlatformLoggedIn(url, platform.id);
  
  if (!platformLoggedIn) {
    // User is not logged in to the platform
    platformNameNotLoggedElem.textContent = platform.name;
    platformIconNotLoggedElem.src = platform.icon;
    showState(states.notPlatformLoggedIn);
    return;
  }
  
  // User is logged in to both MainGallery and the platform
  const connected = await isConnected(platform.id);
  
  if (connected) {
    // Platform is already connected
    connectedPlatformNameElem.textContent = platform.name;
    connectedPlatformIconElem.src = platform.icon;
    showState(states.alreadyConnected);
  } else {
    // Platform is ready to connect
    platformNameElem.textContent = platform.name;
    platformIconElem.src = platform.icon;
    showState(states.readyToConnect);
  }
  
  checkTipsVisibility();
}

// OAuth login handlers (placeholders for now)
function handleGoogleLogin() {
  showToast('Google login coming soon');
}

function handleFacebookLogin() {
  showToast('Facebook login coming soon');
}

// Event listeners
document.addEventListener('DOMContentLoaded', updateUI);

loginBtn.addEventListener('click', () => {
  openAuthPage();
});

// OAuth button listeners
googleLoginBtn.addEventListener('click', handleGoogleLogin);
facebookLoginBtn.addEventListener('click', handleFacebookLogin);

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

viewMyGalleryBtns.forEach(button => {
  button.addEventListener('click', () => {
    openGallery();
  });
});

// Tip close buttons
closeTipBtns.forEach(btn => {
  btn.addEventListener('click', (event) => {
    const tipElement = event.target.closest('.tip-box');
    if (tipElement) {
      handleTipClose(tipElement);
    }
  });
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'updateUI') {
    updateUI();
  }
});
