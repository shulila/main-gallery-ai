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
  notPlatformPage: document.getElementById('not-platform-page'),
  readyToConnect: document.getElementById('ready-to-connect'),
  alreadyConnected: document.getElementById('already-connected'),
  connecting: document.getElementById('connecting')
};

const loginBtn = document.getElementById('login-btn');
const connectBtn = document.getElementById('connect-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const viewGalleryBtn = document.getElementById('view-gallery-btn');
const viewMyGalleryBtns = document.querySelectorAll('#view-my-gallery-btn');
const firstTimeTip = document.getElementById('first-time-tip');

const platformNameElem = document.getElementById('platform-name');
const platformIconElem = document.getElementById('platform-icon');
const connectedPlatformNameElem = document.getElementById('connected-platform-name');
const connectedPlatformIconElem = document.getElementById('connected-platform-icon');
const connectingPlatformNameElem = document.getElementById('connecting-platform-name');

// Constants
const GALLERY_URL = 'https://main-gallery-hub.lovable.app/gallery';
const AUTH_URL = 'https://main-gallery-hub.lovable.app/auth';

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

function connectPlatform(platform) {
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
    alert('Failed to connect. Please try again.');
    updateUI();
  }
}

function disconnectPlatform(platform) {
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
    alert('Failed to disconnect. Please try again.');
  }
}

async function openGallery() {
  try {
    const tabs = await chrome.tabs.query({ url: GALLERY_URL });
    
    if (tabs.length > 0) {
      chrome.tabs.update(tabs[0].id, { active: true });
    } else {
      chrome.tabs.create({ url: GALLERY_URL });
    }
  } catch (error) {
    console.error('Error opening gallery:', error);
  }
}

async function openAuthPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let redirectUrl = '';
    
    if (tab && tab.url) {
      const platform = detectPlatform(tab.url);
      if (platform) {
        redirectUrl = `?redirect=${encodeURIComponent(tab.url)}`;
      }
    }
    
    chrome.tabs.create({ url: `${AUTH_URL}${redirectUrl}` });
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
      
      chrome.storage.local.set({ popup_opened_before: true });
    }
  });
}

async function updateUI() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab.url;
  
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    showState(states.notLoggedIn);
    return;
  }
  
  const platform = detectPlatform(url);
  if (!platform) {
    showState(states.notPlatformPage);
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
