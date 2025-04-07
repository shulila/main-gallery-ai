
// Brand configuration to align with the main app
const BRAND = {
  name: "MainGallery.AI",
  urls: {
    baseUrl: "https://main-gallery-hub.lovable.app",
    auth: "/auth",
    gallery: "/gallery"
  }
};

// Import required utilities - ensure proper module paths with .js extensions
import { isPreviewEnvironment, getBaseUrl, getAuthUrl, getGalleryUrl, isSupportedPlatformUrl } from './utils/urlUtils.js';
import { logger } from './utils/logger.js';
import { handleError } from './utils/errorHandler.js';
import { 
  handleInPopupGoogleLogin, 
  isLoggedIn, 
  getUserEmail, 
  logout, 
  openAuthPage,
  isSupportedPlatform
} from './utils/auth.js';

// Extension ID - important for OAuth flow
const EXTENSION_ID = chrome.runtime.id || 'oapmlmnmepbgiafhbbkjbkbppfdclknlb';

// Log environment for debugging
logger.log('MainGallery.AI popup initialized in', isPreviewEnvironment() ? 'PREVIEW' : 'PRODUCTION', 'environment');
logger.log('Base URL:', getBaseUrl());
logger.log('Auth URL:', getAuthUrl());
logger.log('Gallery URL:', getGalleryUrl());
logger.log('Extension ID:', EXTENSION_ID);

// DOM elements - verify they exist before using them
const states = {
  loading: document.getElementById('loading'),
  loginView: document.getElementById('login-view'),
  mainView: document.getElementById('main-view'),
  errorView: document.getElementById('error-view')
};

// Get elements safely with null checks
const googleLoginBtn = document.getElementById('google-login-btn');
const openWebLoginLink = document.getElementById('open-web-login-link');
const tryAgainBtn = document.getElementById('try-again-btn');
const logoutBtn = document.getElementById('logout-btn');
const openGalleryBtn = document.getElementById('open-gallery-btn');
const scanPageBtn = document.getElementById('scan-page-btn');
const userEmailElement = document.getElementById('user-email');
const statusMessage = document.getElementById('status-message');
const platformDetectedDiv = document.getElementById('platform-detected');
const platformNameElement = document.getElementById('platform-name');
const errorTextElement = document.getElementById('error-text');

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

// Show error state with custom message
function showError(message) {
  if (errorTextElement) {
    // Make sure we never display [object Object] or technical errors
    let displayMessage = message || 'Authentication failed. Please try again.';
    
    if (typeof displayMessage === 'object') {
      displayMessage = 'An error occurred during authentication. Please try again.';
    } else if (displayMessage.includes('invalid_client')) {
      displayMessage = 'Google authentication failed. Please try the full login page instead.';
    }
    
    errorTextElement.textContent = displayMessage;
  }
  showState(states.errorView);
}

// Update platform detection and UI based on current tab
async function checkCurrentTab() {
  try {
    // Get the current active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || !tabs[0] || !tabs[0].url) {
      logger.log('No active tab found or missing URL');
      updateUIForUnsupportedPlatform();
      return false;
    }
    
    const currentUrl = tabs[0].url;
    const isSupported = isSupportedPlatform(currentUrl);
    
    logger.log('Current tab URL:', currentUrl);
    logger.log('Is supported platform:', isSupported);
    
    // Update UI based on platform support
    if (isSupported && platformDetectedDiv && platformNameElement) {
      // Extract platform name from URL
      const urlObj = new URL(currentUrl);
      let platformName = "Unknown";
      
      // Determine platform name based on hostname
      if (urlObj.hostname.includes('midjourney.com')) {
        platformName = "Midjourney";
      } else if (urlObj.hostname.includes('leonardo.ai')) {
        platformName = "Leonardo.ai";
      } else if (urlObj.hostname.includes('pika.art')) {
        platformName = "Pika Labs";
      } else if (urlObj.hostname.includes('openai.com')) {
        platformName = "DALL-E";
      } else if (urlObj.hostname.includes('stability.ai') || urlObj.hostname.includes('dreamstudio.ai')) {
        platformName = "Stable Diffusion";
      } else if (urlObj.hostname.includes('runwayml.com')) {
        platformName = "Runway";
      } else if (urlObj.hostname.includes('discord.com') && urlObj.pathname.includes('midjourney')) {
        platformName = "Midjourney (Discord)";
      } else if (urlObj.hostname.includes('playgroundai.com')) {
        platformName = "Playground AI";
      } else if (urlObj.hostname.includes('nightcafe.studio')) {
        platformName = "NightCafe";
      }
      
      // Additional debug logging for platform detection
      console.log(`MainGallery: Platform detected - ${platformName} from URL ${currentUrl}`);
      
      platformNameElement.textContent = platformName;
      platformDetectedDiv.style.display = 'block';
      
      // Enable "Add to MainGallery" button with active styling
      if (scanPageBtn) {
        scanPageBtn.disabled = false;
        scanPageBtn.title = "Scan this page for AI-generated images";
        safelyRemoveClass(scanPageBtn, 'disabled');
        safelyAddClass(scanPageBtn, 'primary');
      }
      
      return true;
    } else {
      console.log(`MainGallery: No supported platform detected for URL ${currentUrl}`);
      updateUIForUnsupportedPlatform();
      return false;
    }
  } catch (error) {
    handleError('checkCurrentTab', error);
    updateUIForUnsupportedPlatform();
    return false;
  }
}

// Update UI for unsupported platform
function updateUIForUnsupportedPlatform() {
  // Hide platform detection info
  if (platformDetectedDiv) {
    platformDetectedDiv.style.display = 'none';
  }
  
  // Disable scan button with tooltip
  if (scanPageBtn) {
    scanPageBtn.disabled = true;
    scanPageBtn.title = "You must be on a supported AI platform to scan for images";
    safelyAddClass(scanPageBtn, 'disabled');
    safelyRemoveClass(scanPageBtn, 'primary');
  }
}

// Google OAuth login
async function initiateGoogleLogin() {
  try {
    if (states.loading) showState(states.loading);
    logger.log('Starting Google login flow with chrome.identity');
    
    try {
      // Use the handleInPopupGoogleLogin from auth.js
      const response = await handleInPopupGoogleLogin();
      
      if (response.success) {
        logger.log('Login successful:', response.user);
        
        // Show success notification
        showToast('Successfully signed in!', 'success');
        
        // Update UI to show logged-in state
        if (userEmailElement && response.user && response.user.email) {
          userEmailElement.textContent = response.user.email;
        }
        
        showState(states.mainView);
        
        // Check if current tab is a supported platform
        checkCurrentTab();
        
        // Send message to background script to update other contexts
        chrome.runtime.sendMessage({ 
          action: 'updateUI',
          userEmail: response.user?.email
        });
      } else {
        throw new Error('Login failed');
      }
    } catch (oauthError) {
      logger.error('OAuth error:', oauthError);
      
      // Show human-readable error
      let errorMessage = 'Authentication failed.';
      
      if (oauthError.message.includes('did not approve')) {
        errorMessage = 'You did not approve access to your Google account.';
      } else if (oauthError.message.includes('invalid_client')) {
        errorMessage = 'OAuth client configuration error. Please try opening the full login page instead.';
      } else if (oauthError.message.includes('cancel')) {
        errorMessage = 'Authentication was canceled.';
      } else if (oauthError.message.includes('access')) {
        errorMessage = 'Could not connect to Google. Please try again later.';
      }
      
      showError(errorMessage);
    }
  } catch (error) {
    logger.error('Error initiating Google login:', error);
    showError('Could not start login process. Please try again or use the full login page option.');
  }
}

// Enhanced auth check with token validation
async function checkAuthAndRedirect() {
  try {
    if (states.loading) showState(states.loading);
    logger.log('Checking authentication status...');
    
    // Use isLoggedIn from auth.js
    const loggedIn = await isLoggedIn();
    
    if (loggedIn) {
      logger.log('User is logged in, showing logged-in state');
      
      // Get user email to display
      const userEmail = await getUserEmail();
      logger.log('User email:', userEmail);
      
      if (userEmail && userEmailElement) {
        userEmailElement.textContent = userEmail;
      }
      
      showState(states.mainView);
      
      // Check if current tab is a supported platform
      checkCurrentTab();
    } else {
      logger.log('User is not logged in, showing login options');
      showState(states.loginView);
    }
  } catch (error) {
    logger.error('Error checking auth status:', error);
    showToast('Connection error', 'error');
    showState(states.loginView); // Default to login view
  }
}

// Open gallery in new tab or focus existing tab
function openGallery() {
  try {
    const galleryUrl = getGalleryUrl();
    logger.log('Opening gallery at', galleryUrl);
    
    // Send message to background script to handle opening gallery
    chrome.runtime.sendMessage({ action: 'openGallery' });
    
    // Close popup after navigation request
    window.close();
  } catch (error) {
    logger.error('Error opening gallery:', error);
    showToast('Could not open gallery. Please try again.', 'error');
  }
}

// Open auth page for full login experience
function openWebLogin() {
  try {
    if (states.loading) showState(states.loading);
    logger.log('Opening full web login page');
    
    // Use openAuthPage from auth.js
    openAuthPage(null, { from: 'extension_popup' });
    
    // Close popup after a short delay
    setTimeout(() => window.close(), 300);
  } catch (error) {
    logger.error('Error opening web login:', error);
    showToast('Could not open login page. Please try again.', 'error');
    showState(states.loginView);
  }
}

// Log out the user
function handleLogout() {
  logout().then(success => {
    showState(states.loginView);
    showToast('You have been logged out', 'info');
  });
}

// Scan current page for images
function scanCurrentPage() {
  logger.log('Starting scan of current page...');
  
  // Check if button is disabled (unsupported platform)
  if (scanPageBtn && scanPageBtn.disabled) {
    showToast('This platform is not supported for scanning', 'error');
    return;
  }
  
  showToast('Scanning page for AI images...', 'info');
  
  // Request background script to scan the current active tab
  chrome.runtime.sendMessage({ action: 'startAutoScan' }, (response) => {
    if (chrome.runtime.lastError || !response || !response.success) {
      logger.error('Error starting scan:', chrome.runtime.lastError || 'Unknown error');
      showToast('Failed to start scanning. Please try again.', 'error');
    } else {
      logger.log('Scan started successfully');
      // Status message will be shown by the background script
      
      // Close popup after starting the scan
      setTimeout(() => window.close(), 500);
    }
  });
}

// Reset UI and try again
function resetAndTryAgain() {
  showState(states.loginView);
}

// Check for auth status immediately when popup opens
document.addEventListener('DOMContentLoaded', () => {
  logger.log('Popup loaded, checking auth status');
  checkAuthAndRedirect();
  
  // Set up event listeners for Google login
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', initiateGoogleLogin);
    logger.log('Google login button listener set up');
  }
  
  // Set up event listener for trying again after error
  if (tryAgainBtn) {
    tryAgainBtn.addEventListener('click', resetAndTryAgain);
    logger.log('Try again button listener set up');
  }
  
  // Set up event listener for opening full web login
  if (openWebLoginLink) {
    openWebLoginLink.addEventListener('click', (e) => {
      e.preventDefault();
      openWebLogin();
    });
    logger.log('Open web login link listener set up');
  }
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
    logger.log('Logout button listener set up');
  }
  
  if (openGalleryBtn) {
    openGalleryBtn.addEventListener('click', openGallery);
    logger.log('Open gallery button listener set up');
  }
  
  if (scanPageBtn) {
    scanPageBtn.addEventListener('click', scanCurrentPage);
    logger.log('Scan page button listener set up');
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
  } else if (message.action === 'platformDetected') {
    // Update platform display if platform was detected by content script
    if (platformNameElement && message.platformName) {
      platformNameElement.textContent = message.platformName;
      if (platformDetectedDiv) {
        platformDetectedDiv.style.display = 'block';
      }
    }
  } else if (message.action === 'authError') {
    // Handle authentication errors
    showError(message.error || 'Authentication failed. Please try again.');
  }
});
