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

const platformNameElem = document.getElementById('platform-name');
const platformIconElem = document.getElementById('platform-icon');
const connectedPlatformNameElem = document.getElementById('connected-platform-name');
const connectedPlatformIconElem = document.getElementById('connected-platform-icon');
const connectingPlatformNameElem = document.getElementById('connecting-platform-name');

// Constants
const GALLERY_URL = 'https://main-gallery-hub.lovable.app/gallery';

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
    // This is a placeholder for the actual connection logic
    // In a real implementation, we would use OAuth, API tokens, etc.
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulating API call
    
    // Store the token (this would be a real token in production)
    const tokenData = {
      token: 'sample_token_for_' + platform.id,
      connectedAt: new Date().toISOString()
    };
    
    await new Promise(resolve => {
      const data = {};
      data[platform.tokenStorageKey] = tokenData;
      chrome.storage.sync.set(data, resolve);
    });
    
    // Send message to background script to notify of connection
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

async function disconnectPlatform(platform) {
  try {
    await new Promise(resolve => {
      const data = {};
      data[platform.tokenStorageKey] = null;
      chrome.storage.sync.remove(platform.tokenStorageKey, resolve);
    });
    
    // Send message to background script to notify of disconnection
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

// Function to open the user's gallery
async function openGallery() {
  try {
    // Check if gallery tab is already open
    const tabs = await chrome.tabs.query({ url: GALLERY_URL });
    
    if (tabs.length > 0) {
      // Gallery tab is already open, switch to it
      chrome.tabs.update(tabs[0].id, { active: true });
    } else {
      // Open a new gallery tab
      chrome.tabs.create({ url: GALLERY_URL });
    }
  } catch (error) {
    console.error('Error opening gallery:', error);
  }
}

// Main UI update function
async function updateUI() {
  // Get the current tab URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab.url;
  
  // Check if user is logged in to Main Gallery
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    showState(states.notLoggedIn);
    return;
  }
  
  // Detect the platform from the URL
  const platform = detectPlatform(url);
  if (!platform) {
    showState(states.notPlatformPage);
    return;
  }
  
  // Check if the platform is already connected
  const connected = await isConnected(platform.id);
  
  if (connected) {
    // Show the already connected state
    connectedPlatformNameElem.textContent = platform.name;
    connectedPlatformIconElem.src = platform.icon;
    showState(states.alreadyConnected);
  } else {
    // Show the ready to connect state
    platformNameElem.textContent = platform.name;
    platformIconElem.src = platform.icon;
    showState(states.readyToConnect);
  }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', updateUI);

loginBtn.addEventListener('click', () => {
  // Instead of opening a tab, just log the action
  console.log('Login button clicked');
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
  // Instead of opening a tab, just log the action
  console.log('View gallery button clicked');
});

// Add event listeners for all "Go to My Gallery" buttons
viewMyGalleryBtns.forEach(button => {
  button.addEventListener('click', () => {
    openGallery();
  });
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'updateUI') {
    updateUI();
  }
});
