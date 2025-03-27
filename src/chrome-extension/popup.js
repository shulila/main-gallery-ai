
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
  readyToConnect: document.getElementById('ready-to-connect'),
  alreadyConnected: document.getElementById('already-connected'),
  connecting: document.getElementById('connecting')
};

const loginBtn = document.getElementById('login-btn');
const connectBtn = document.getElementById('connect-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const viewGalleryBtn = document.getElementById('view-gallery-btn');
const viewMyGalleryBtns = document.querySelectorAll('.view-my-gallery-btn');
const firstTimeTip = document.getElementById('first-time-tip');
const pinExtensionTip = document.getElementById('pin-extension-tip');

const platformNameElem = document.getElementById('platform-name');
const platformIconElem = document.getElementById('platform-icon');
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
    await new Promise(resolve => setTimeout(resolve, 1500));
    
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
    showToast('✓ Connected to ' + platform.name);
    
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
    // In a production environment, this would make a real API call
    // to disconnect the user's platform account
    
    // Mark platform as disconnected
    chrome.storage.local.set({ [`platform_${platform.id}_connected`]: false }, function() {
      console.log(`Platform ${platform.id} connection state saved: false`);
    });
    
    chrome.runtime.sendMessage({
      action: 'platformDisconnected',
      platform: platform.id
    });
    
    updateUI();
    showToast('✓ Disconnected from ' + platform.name);
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
    
    // Close the popup after navigating
    window.close();
  } catch (error) {
    console.error('Error opening auth page:', error);
  }
}

function checkFirstTimeUser() {
  chrome.storage.local.get(['popup_opened_before'], function(result) {
    if (!result.popup_opened_before) {
      if (firstTimeTip) {
        firstTimeTip.classList.remove('hidden');
      }
      
      // Show the pin extension tip only once
      chrome.storage.local.get(['pin_prompt_shown'], function(pinResult) {
        if (!pinResult.pin_prompt_shown && pinExtensionTip) {
          pinExtensionTip.classList.remove('hidden');
          promptPinExtension();
          chrome.storage.local.set({ pin_prompt_shown: true });
        }
      });
      
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
    // If first time, show welcome message with clear login CTA
    chrome.storage.local.get(['popup_opened_before'], function(result) {
      if (!result.popup_opened_before) {
        if (firstTimeTip) {
          firstTimeTip.classList.remove('hidden');
        }
        
        chrome.storage.local.set({ popup_opened_before: true });
      }
    });
    
    showState(states.notLoggedIn);
    
    // Update login button text to clarify action
    if (loginBtn) {
      loginBtn.textContent = 'Login / Sign up';
    }
    
    return;
  } else {
    // If user is logged in, show appropriate state based on the current page
    const platform = detectPlatform(url);
    
    if (!platform) {
      // Show logged in message and then not platform page
      states.loggedInMessage.classList.remove('hidden');
      
      setTimeout(() => {
        showState(states.notPlatformPage);
      }, 1000);
      return;
    }
    
    const connected = await isConnected(platform.id);
    
    if (connected) {
      connectedPlatformNameElem.textContent = platform.name;
      connectedPlatformIconElem.src = platform.icon;
      showState(states.alreadyConnected);
      
      // Update button text to be clearer - show this is where to view their gallery
      if (viewGalleryBtn) {
        viewGalleryBtn.textContent = 'Open Main Gallery';
      }
    } else {
      platformNameElem.textContent = platform.name;
      platformIconElem.src = platform.icon;
      showState(states.readyToConnect);
      
      // Update button text to clarify the action
      if (connectBtn) {
        connectBtn.textContent = `Add ${platform.name} to Main Gallery`;
      }
    }
  }
  
  checkFirstTimeUser();
}

document.addEventListener('DOMContentLoaded', updateUI);

loginBtn.addEventListener('click', () => {
  openAuthPage();
});

connectBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const platform = detectPlatform(tab.url);
  if (platform) {
    connectPlatform(platform);
  }
});

disconnectBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const platform = detectPlatform(tab.url);
  if (platform) {
    disconnectPlatform(platform);
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

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'updateUI') {
    updateUI();
  }
});
