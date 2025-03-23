
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
    chrome.storage.sync.get([PLATFORMS[platformId].tokenStorageKey], result => {
      resolve(!!result[PLATFORMS[platformId].tokenStorageKey]);
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
    
    const tokenData = {
      token: 'sample_token_for_' + platform.id,
      connectedAt: new Date().toISOString()
    };
    
    await new Promise(resolve => {
      const data = {};
      data[platform.tokenStorageKey] = tokenData;
      chrome.storage.sync.set(data, resolve);
    });
    
    chrome.runtime.sendMessage({
      action: 'platformConnected',
      platform: platform.id
    });
    
    updateUI();
  } catch (error) {
    console.error('Error connecting platform:', error);
    showToast('Failed to connect. Please try again.');
    updateUI();
  }
}

async function disconnectPlatform(platform) {
  try {
    await new Promise(resolve => {
      const data = {};
      data[platform.tokenStorageKey] = null;
      chrome.storage.sync.remove(platform.tokenStorageKey, resolve);
    });
    
    chrome.runtime.sendMessage({
      action: 'platformDisconnected',
      platform: platform.id
    });
    
    updateUI();
  } catch (error) {
    console.error('Error disconnecting platform:', error);
    showToast('Failed to disconnect. Please try again.');
  }
}

async function openGallery() {
  try {
    const tabs = await chrome.tabs.query({ url: GALLERY_URL + '*' });
    
    if (tabs.length > 0) {
      chrome.tabs.update(tabs[0].id, { active: true });
    } else {
      chrome.tabs.create({ url: GALLERY_URL });
    }
  } catch (error) {
    console.error('Error opening gallery:', error);
  }
}

function getAuthUrlWithRedirect(currentUrl) {
  if (!currentUrl) return AUTH_URL;
  const encodedRedirect = encodeURIComponent(currentUrl);
  return `${AUTH_URL}?redirect=${encodedRedirect}&tab=login`;
}

async function openAuthPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let redirectUrl = '';
    
    if (tab && tab.url) {
      redirectUrl = tab.url;
    }
    
    const authUrl = getAuthUrlWithRedirect(redirectUrl);
    chrome.tabs.create({ url: authUrl });
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
      
      // Show the pin extension tip too
      if (pinExtensionTip) {
        pinExtensionTip.classList.remove('hidden');
      }
      
      chrome.storage.local.set({ popup_opened_before: true });
      
      // Prompt to pin the extension
      promptPinExtension();
    }
  });
}

// Function to prompt user to pin the extension
function promptPinExtension() {
  if (pinExtensionTip) {
    pinExtensionTip.classList.remove('hidden');
  }
  
  // Also show a toast notification
  showToast('📌 Tip: Pin this extension for quick access');
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
    showState(states.notLoggedIn);
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
    } else {
      platformNameElem.textContent = platform.name;
      platformIconElem.src = platform.icon;
      showState(states.readyToConnect);
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
