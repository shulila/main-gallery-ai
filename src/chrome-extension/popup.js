
// Brand configuration to align with the main app
const BRAND = {
  name: "MainGallery.AI",
  urls: {
    baseUrl: "https://main-gallery-hub.lovable.app",
    auth: "/auth",
    gallery: "/gallery"
  }
};

// Gallery URL with base from brand config
const GALLERY_URL = `${BRAND.urls.baseUrl}${BRAND.urls.gallery}`;
const AUTH_URL = `${BRAND.urls.baseUrl}${BRAND.urls.auth}`;

// DOM elements
const states = {
  notLoggedIn: document.getElementById('not-logged-in'),
  authLoading: document.getElementById('auth-loading'),
  loggedIn: document.getElementById('logged-in')
};

const loginBtn = document.getElementById('login-btn');
const googleLoginBtn = document.getElementById('google-login-btn');
const logoutBtn = document.getElementById('logout-btn');
const openGalleryBtn = document.getElementById('open-gallery-btn');

// Helper functions
function hideAllStates() {
  Object.values(states).forEach(state => state.classList.add('hidden'));
}

function showState(state) {
  hideAllStates();
  state.classList.remove('hidden');
}

function isLoggedIn() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['main_gallery_auth_token'], result => {
      resolve(!!result.main_gallery_auth_token);
    });
  });
}

// Show toast notification
function showToast(message, type = 'info') {
  // Remove any existing toasts
  const existingToast = document.querySelector('.main-gallery-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `main-gallery-toast ${type}`;
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

// Check auth and update UI
async function checkAuthAndRedirect() {
  try {
    showState(states.authLoading); // Show loading state while checking
    
    const loggedIn = await isLoggedIn();
    
    if (loggedIn) {
      console.log('User is logged in, showing logged-in state');
      showState(states.loggedIn);
      return true;
    }
    
    console.log('User is not logged in, showing login options');
    showState(states.notLoggedIn);
    return false;
  } catch (error) {
    console.error('Error checking auth status:', error);
    showState(states.notLoggedIn);
    return false;
  }
}

// Open gallery in new tab or focus existing tab
function openGallery() {
  try {
    console.log('Opening gallery at', GALLERY_URL);
    
    // Send message to background script to handle opening gallery
    chrome.runtime.sendMessage({ action: 'openGallery' });
    
    // Close popup after navigation request
    window.close();
  } catch (error) {
    console.error('Error opening gallery:', error);
    showToast('Could not open gallery. Please try again.', 'error');
  }
}

// Open auth page with email login
function openAuthPage() {
  try {
    showState(states.authLoading);
    console.log('Opening auth page with email/password login');
    showToast('Opening login page...', 'info');
    
    chrome.runtime.sendMessage({ 
      action: 'openAuthPage',
      from: 'extension'
    });
    
    // Close popup after a short delay
    setTimeout(() => window.close(), 300);
  } catch (error) {
    console.error('Error opening auth page:', error);
    showToast('Could not open login page. Please try again.', 'error');
    showState(states.notLoggedIn);
  }
}

// Open auth with Google provider - using direct OAuth URL construction
function openAuthWithProvider(provider) {
  try {
    showState(states.authLoading);
    console.log(`Opening ${provider} login...`);
    showToast(`Opening ${provider} login...`, 'info');
    
    chrome.runtime.sendMessage({
      action: 'openAuthWithProvider',
      provider: provider
    });
    
    // Close popup after a short delay
    setTimeout(() => window.close(), 300);
  } catch (error) {
    console.error(`Error opening ${provider} auth:`, error);
    showToast(`Could not open ${provider} login. Please try again.`, 'error');
    showState(states.notLoggedIn);
  }
}

// Log out the user
function logout() {
  chrome.runtime.sendMessage({ action: 'logout' }, response => {
    showState(states.notLoggedIn);
    showToast('You have been logged out', 'info');
  });
}

// Immediately check auth status when popup opens
document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup loaded, checking auth status');
  checkAuthAndRedirect();
  
  // Set up event listeners for buttons
  if (loginBtn) {
    loginBtn.addEventListener('click', openAuthPage);
    console.log('Login button listener set up');
  }
  
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', () => {
      console.log('Google login button clicked');
      openAuthWithProvider('google');
    });
    console.log('Google login button listener set up');
  }
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
  
  if (openGalleryBtn) {
    openGalleryBtn.addEventListener('click', openGallery);
  }
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'updateUI') {
    checkAuthAndRedirect();
  }
});
