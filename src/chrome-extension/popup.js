
// Brand configuration to align with the main app
const BRAND = {
  name: "MainGallery.AI",
  urls: {
    baseUrl: "https://main-gallery-ai.lovable.app",
    auth: "/auth",
    gallery: "/gallery"
  }
};

// Domain patterns for scanning - only supported platforms
const SUPPORTED_DOMAINS = [
  // Midjourney
  { pattern: /midjourney\.com/i, name: "Midjourney" },
  // Leonardo.ai
  { pattern: /leonardo\.ai/i, name: "Leonardo AI" },
  // Runway
  { pattern: /runwayml\.com/i, name: "Runway ML" },
  // DreamStudio
  { pattern: /dreamstudio\.ai/i, name: "Dream Studio" },
  // Pika
  { pattern: /pika\.art/i, name: "Pika" },
  // DALL-E
  { pattern: /openai\.com\/dall-e/i, name: "DALL-E" },
  // Playground AI
  { pattern: /playgroundai\.com/i, name: "Playground AI" },
  // NightCafe
  { pattern: /nightcafe\.studio/i, name: "NightCafe" },
  // Adobe Firefly
  { pattern: /firefly\.adobe\.com/i, name: "Adobe Firefly" },
  // Stability AI
  { pattern: /stability\.ai/i, name: "Stability AI" },
  // Kaiber
  { pattern: /kaiber\.ai/i, name: "Kaiber" },
  // Veed.io
  { pattern: /veed\.io/i, name: "Veed" },
  // Fluxlabs
  { pattern: /fluxlabs\.ai/i, name: "Fluxlabs" },
  // Krea.ai
  { pattern: /krea\.ai/i, name: "Krea" },
  // HailuoAI
  { pattern: /hailuoai\.video/i, name: "HailuoAI" },
  // LTX Studio
  { pattern: /app\.ltx\.studio/i, name: "LTX Studio" },
  // D-ID
  { pattern: /studio\.d-id\.com/i, name: "D-ID" },
  // HeyGen
  { pattern: /app\.heygen\.com/i, name: "HeyGen" },
  // Reve.art
  { pattern: /preview\.reve\.art/i, name: "Reve.art" },
  // Lexica
  { pattern: /lexica\.art/i, name: "Lexica" },
  // Looka
  { pattern: /looka\.com/i, name: "Looka" },
  // Reroom.ai
  { pattern: /reroom\.ai/i, name: "Reroom" },
  // Genmo.ai
  { pattern: /genmo\.ai/i, name: "Genmo" },
  // Botika.io
  { pattern: /app\.botika\.io/i, name: "Botika" },
  // Playground.com
  { pattern: /playground\.com/i, name: "Playground" },
  // Dream.ai
  { pattern: /dream\.ai/i, name: "Dream AI" },
  // Pixverse.ai
  { pattern: /app\.pixverse\.ai/i, name: "Pixverse" },
  // Starryai
  { pattern: /starryai\.com/i, name: "Starry AI" },
  // Fotor
  { pattern: /fotor\.com/i, name: "Fotor" },
  // DeviantArt
  { pattern: /deviantart\.com/i, name: "DeviantArt" },
  // DeepAI
  { pattern: /deepai\.org/i, name: "DeepAI" },
  // Elai.io
  { pattern: /app\.elai\.io/i, name: "Elai" },
  // Rundiffusion
  { pattern: /app\.rundiffusion\.com/i, name: "RunDiffusion" },
  // Neural.love
  { pattern: /neural\.love/i, name: "Neural.love" },
  // Vidu
  { pattern: /vidu\.com/i, name: "Vidu" },
  // PromeAI
  { pattern: /promeai\.pro/i, name: "PromeAI" },
  // GenSpark
  { pattern: /genspark\.ai/i, name: "GenSpark" },
  // FreePik
  { pattern: /freepik\.com/i, name: "FreePik" },
  // Sora
  { pattern: /sora\.com/i, name: "Sora" },
  // KlingAI
  { pattern: /app\.klingai\.com/i, name: "KlingAI" },
  // Lumalabs
  { pattern: /dream-machine\.lumalabs\.ai/i, name: "Lumalabs" }
];

// Import required utilities - ensure proper module paths with .js extensions
import { isPreviewEnvironment, getBaseUrl, getAuthUrl, getGalleryUrl } from './utils/urlUtils.js';
import { logger } from './utils/logger.js';
import { handleError, safeFetch } from './utils/errorHandler.js';
import { 
  handleInPopupGoogleLogin, 
  isLoggedIn, 
  getUserEmail, 
  logout, 
  openAuthPage
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
const emailLoginBtn = document.getElementById('email-login-btn');
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

// Validate tab exists before attempting to communicate with it
async function tabExists(tabId) {
  try {
    return new Promise((resolve) => {
      chrome.tabs.get(tabId, (tab) => {
        const error = chrome.runtime.lastError;
        if (error) {
          logger.log(`Tab ${tabId} doesn't exist:`, error.message);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  } catch (error) {
    logger.error('Error checking if tab exists:', error);
    return false;
  }
}

// Check if URL matches any of our supported platform patterns
function isSupportedPlatformUrl(url) {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    return SUPPORTED_DOMAINS.some(domain => domain.pattern.test(urlObj.hostname));
  } catch (e) {
    logger.error('Error parsing URL:', e);
    return false;
  }
}

// Get platform name from URL
function getPlatformName(url) {
  if (!url) return "Unknown";
  
  try {
    const urlObj = new URL(url);
    const matchedDomain = SUPPORTED_DOMAINS.find(domain => domain.pattern.test(urlObj.hostname));
    return matchedDomain ? matchedDomain.name : "Unknown";
  } catch (e) {
    logger.error('Error getting platform name:', e);
    return "Unknown";
  }
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
    const isSupported = isSupportedPlatformUrl(currentUrl);
    
    logger.log('Current tab URL:', currentUrl);
    logger.log('Matches supported platform pattern:', isSupported);
    
    // Update UI based on platform support
    if (isSupported && platformDetectedDiv && platformNameElement) {
      // Get platform name
      const platformName = getPlatformName(currentUrl);
      
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

// Email login - redirect to web page
function initiateEmailLogin() {
  try {
    logger.log('Redirecting to email login page');
    openAuthPage(null, { from: 'extension_popup' });
    // Close popup after redirection
    setTimeout(() => window.close(), 300);
  } catch (error) {
    logger.error('Error redirecting to email login:', error);
    showToast('Could not open login page. Please try again.', 'error');
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
    const error = chrome.runtime.lastError;
    if (error || !response || !response.success) {
      logger.error('Error starting scan:', error?.message || 'Unknown error');
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

// Set timeout to prevent infinite loading spinner
const loadingTimeoutMs = 5000; // 5 seconds
let loadingTimeout;

function startLoadingTimeout() {
  if (states.loading && loadingTimeout === undefined) {
    loadingTimeout = setTimeout(() => {
      // Check if we're still in loading state
      if (states.loading.style.display !== 'none') {
        logger.log('Loading timeout reached, showing error');
        showError('Loading timed out. Please try again or reload the extension.');
      }
    }, loadingTimeoutMs);
  }
}

function clearLoadingTimeout() {
  if (loadingTimeout) {
    clearTimeout(loadingTimeout);
    loadingTimeout = undefined;
  }
}

// Check for auth status immediately when popup opens
document.addEventListener('DOMContentLoaded', () => {
  logger.log('Popup loaded, checking auth status');
  
  // Start loading timeout
  startLoadingTimeout();
  
  // Check authentication status
  checkAuthAndRedirect().then(() => {
    // Clear loading timeout once auth check completes
    clearLoadingTimeout();
  }).catch(error => {
    logger.error('Error during auth check:', error);
    clearLoadingTimeout();
    showError('Failed to check login status. Please try again.');
  });
  
  // Set up event listeners for Google login
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', initiateGoogleLogin);
    logger.log('Google login button listener set up');
  }
  
  // Set up event listener for email login
  if (emailLoginBtn) {
    emailLoginBtn.addEventListener('click', initiateEmailLogin);
    logger.log('Email login button listener set up');
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
