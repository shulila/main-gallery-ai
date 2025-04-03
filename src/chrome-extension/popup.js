
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

// DOM elements - verify they exist before using them
const states = {
  loading: document.getElementById('loading'),
  loginView: document.getElementById('login-view'),
  mainView: document.getElementById('main-view')
};

// Get elements safely with null checks
const googleLoginBtn = document.getElementById('google-login-btn');
const emailLoginBtn = document.getElementById('email-login-btn');
const logoutBtn = document.getElementById('logout-btn');
const openGalleryBtn = document.getElementById('open-gallery-btn');
const scanPageBtn = document.getElementById('scan-page-btn');
const userEmailElement = document.getElementById('user-email');
const statusMessage = document.getElementById('status-message');

// Helper functions
function safelyAddClass(element, className) {
  if (element && element.classList) {
    element.classList.add(className);
  }
}

function safelyRemoveClass(element, className) {
  if (element && element.classList) {
    element.classList.remove(className);
  }
}

function hideAllStates() {
  Object.values(states).forEach(state => {
    if (state) safelyAddClass(state, 'hidden');
  });
}

function showState(state) {
  hideAllStates();
  if (state) safelyRemoveClass(state, 'hidden');
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

// Enhanced auth check with token validation
async function checkAuthAndRedirect() {
  try {
    if (states.loading) showState(states.loading); // Show loading state while checking
    console.log('Checking authentication status with validation...');
    
    // Check authentication with the background script
    chrome.runtime.sendMessage({ action: 'isLoggedIn' }, async (response) => {
      try {
        const loggedIn = response && response.loggedIn;
        
        if (loggedIn) {
          console.log('User is logged in, showing logged-in state');
          
          // Get user email to display if available
          chrome.runtime.sendMessage({ action: 'getUserEmail' }, (emailResponse) => {
            const userEmail = emailResponse && emailResponse.email;
            console.log('User email:', userEmail);
            
            if (userEmail && userEmailElement) {
              userEmailElement.textContent = userEmail;
            }
            
            if (states.mainView) showState(states.mainView);
          });
        } else {
          console.log('User is not logged in, showing login options');
          if (states.loginView) showState(states.loginView);
        }
      } catch (err) {
        console.error('Error processing auth status:', err);
        if (states.loginView) showState(states.loginView); // Default to login view
      }
    });
  } catch (error) {
    console.error('Error checking auth status:', error);
    if (states.loginView) showState(states.loginView); // Default to login view
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

// Open auth page with email login - make sure to use the same login page for all flows
function openAuthPage() {
  try {
    if (states.loading) showState(states.loading);
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
    if (states.loginView) showState(states.loginView);
  }
}

// Initiate Google login using chrome.identity API 
function initiateGoogleLogin() {
  try {
    if (states.loading) showState(states.loading);
    console.log('Initiating Google login via chrome.identity API');
    showToast('Starting Google login...', 'info');
    
    chrome.runtime.sendMessage({ action: 'googleLogin' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error initiating Google login:', chrome.runtime.lastError);
        showToast('Google login failed. Please try again.', 'error');
        if (states.loginView) showState(states.loginView);
        return;
      }
      
      if (response && response.success) {
        console.log('Google login initiated successfully');
        // Success will be handled via the auth callback
        
        // Close popup after a short delay to improve UX
        setTimeout(() => window.close(), 300);
      } else {
        console.error('Google login failed:', response?.error || 'Unknown error');
        showToast('Google login failed. Please try again.', 'error');
        if (states.loginView) showState(states.loginView);
      }
    });
  } catch (error) {
    console.error('Error initiating Google login:', error);
    showToast('Google login failed. Please try again.', 'error');
    if (states.loginView) showState(states.loginView);
  }
}

// Log out the user
function logout() {
  chrome.runtime.sendMessage({ action: 'logout' }, response => {
    if (states.loginView) showState(states.loginView);
    showToast('You have been logged out', 'info');
  });
}

// Scan current page for images
function scanCurrentPage() {
  console.log('Starting scan of current page...');
  showToast('Scanning page for AI images...', 'info');
  
  // Request background script to scan the current active tab
  chrome.runtime.sendMessage({ action: 'startAutoScan' }, (response) => {
    if (chrome.runtime.lastError || !response || !response.success) {
      console.error('Error starting scan:', chrome.runtime.lastError || 'Unknown error');
      showToast('Failed to start scanning. Please try again.', 'error');
    } else {
      console.log('Scan started successfully');
      // Status message will be shown by the background script
      
      // Close popup after starting the scan
      setTimeout(() => window.close(), 500);
    }
  });
}

// Check for auth status immediately when popup opens
document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup loaded, checking auth status');
  checkAuthAndRedirect();
  
  // Set up event listeners for buttons - all with null checks
  if (emailLoginBtn) {
    emailLoginBtn.addEventListener('click', openAuthPage);
    console.log('Email login button listener set up');
  }
  
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', initiateGoogleLogin);
    console.log('Google login button listener set up');
  }
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
    console.log('Logout button listener set up');
  }
  
  if (openGalleryBtn) {
    openGalleryBtn.addEventListener('click', openGallery);
    console.log('Open gallery button listener set up');
  }
  
  if (scanPageBtn) {
    scanPageBtn.addEventListener('click', scanCurrentPage);
    console.log('Scan page button listener set up');
  }
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'updateUI') {
    checkAuthAndRedirect();
  } else if (message.action === 'scanComplete') {
    if (message.success) {
      showToast(`${message.imageCount || 'Multiple'} images found and synced to gallery`, 'success');
    } else {
      showToast('No images found or error during scan', 'error');
    }
  }
});
