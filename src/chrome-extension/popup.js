
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
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const signupLink = document.getElementById('signup-link');
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
    if (state) {
      state.style.display = 'none';
    }
  });
}

function showState(state) {
  hideAllStates();
  if (state) {
    state.style.display = 'block';
  }
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
        // Handle no response (possible disconnection)
        if (!response) {
          console.error('No response from background script');
          showToast('Connection error. Please try again.', 'error');
          if (states.loginView) showState(states.loginView);
          return;
        }
        
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
        showToast('Error checking login status', 'error');
        if (states.loginView) showState(states.loginView); // Default to login view
      }
    });
  } catch (error) {
    console.error('Error checking auth status:', error);
    showToast('Connection error', 'error');
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

// Handle email/password login
function handleLogin(e) {
  if (e) e.preventDefault();
  
  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value.trim() : '';
  
  if (!email || !password) {
    showToast('Please enter both email and password', 'error');
    return;
  }
  
  if (states.loading) showState(states.loading);
  console.log('Attempting login with email:', email);
  
  // Send login request to background script
  chrome.runtime.sendMessage({
    action: 'login',
    email: email,
    password: password
  }, (response) => {
    // Handle no response case (possible disconnect)
    if (!response) {
      console.error('No response from background script');
      showToast('Server connection error. Please try again later.', 'error');
      if (states.loginView) showState(states.loginView);
      return;
    }
    
    if (response && response.success) {
      showToast('Login successful', 'success');
      checkAuthAndRedirect(); // This will update UI based on new auth state
    } else {
      console.error('Login failed:', response?.error || 'Unknown error');
      
      // Show more specific error message based on type
      let errorMessage = 'Login failed. Please check your credentials.';
      
      if (response?.error) {
        if (response.error.includes('format') || response.error.includes('HTML')) {
          errorMessage = 'Invalid server response format. Please try again later.';
        } else if (response.error.includes('network') || response.error.includes('connect')) {
          errorMessage = 'Network error. Please check your connection.';
        } else if (response.error.includes('credentials') || response.error.includes('password')) {
          errorMessage = 'Invalid email or password. Please try again.';
        }
      }
      
      showToast(errorMessage, 'error');
      if (states.loginView) showState(states.loginView);
    }
  });
}

// Open auth page for signup or password reset
function openAuthPage(options = {}) {
  try {
    if (states.loading) showState(states.loading);
    console.log('Opening auth page with options:', options);
    showToast('Opening login page...', 'info');
    
    chrome.runtime.sendMessage({ 
      action: 'openAuthPage',
      ...options,
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
  
  // Set up event listeners for form submission
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
    console.log('Login form submission listener set up');
  }
  
  // Set up event listeners for auth links
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      openAuthPage({ forgotPassword: true });
    });
    console.log('Forgot password link listener set up');
  }
  
  if (signupLink) {
    signupLink.addEventListener('click', (e) => {
      e.preventDefault();
      openAuthPage({ signup: true });
    });
    console.log('Signup link listener set up');
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
