
/**
 * MainGallery.AI Chrome Extension Popup Script
 */

import { logger } from './utils/logger.js';
import { storage, STORAGE_KEYS } from './utils/storage.js';
import { authService } from './utils/auth/auth-service.js';
import { syncAuthState } from './utils/auth/auth-sync.js';
import { setupImageErrorHandling, preloadCriticalImages } from './utils/image-handler.js';
import { validateExtension, showValidationWarnings } from './utils/extension-validator.js';
import { safeFetch } from './utils/fetch-utils.js';

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
  // Additional platforms
  { pattern: /playgroundai\.com/i, name: "Playground AI" },
  { pattern: /nightcafe\.studio/i, name: "NightCafe" },
  { pattern: /firefly\.adobe\.com/i, name: "Adobe Firefly" },
  { pattern: /stability\.ai/i, name: "Stability AI" },
  { pattern: /kaiber\.ai/i, name: "Kaiber" },
  { pattern: /veed\.io/i, name: "Veed" },
  { pattern: /fluxlabs\.ai/i, name: "Fluxlabs" },
  { pattern: /krea\.ai/i, name: "Krea" },
  { pattern: /hailuoai\.video/i, name: "HailuoAI" },
  { pattern: /app\.ltx\.studio/i, name: "LTX Studio" }
];

// Store DOM elements
const elements = {
  views: {
    loading: document.getElementById('loading'),
    login: document.getElementById('login-view'),
    error: document.getElementById('error-view'),
    main: document.getElementById('main-view')
  },
  buttons: {
    googleLogin: document.getElementById('google-login-btn'),
    emailLogin: document.getElementById('email-login-btn'),
    tryAgain: document.getElementById('try-again-btn'),
    logout: document.getElementById('logout-btn'),
    openGallery: document.getElementById('open-gallery-btn'),
    scanPage: document.getElementById('scan-page-btn')
  },
  inputs: {
    email: document.getElementById('email-input'),
    password: document.getElementById('password-input')
  },
  display: {
    userEmail: document.getElementById('user-email'),
    platformInfo: document.getElementById('platform-detected'),
    platformName: document.getElementById('platform-name'),
    errorText: document.getElementById('error-text'),
    statusMessage: document.getElementById('status-message')
  }
};

// UI helper functions
function showView(viewName) {
  // Hide all views
  Object.keys(elements.views).forEach(key => {
    if (elements.views[key]) {
      elements.views[key].style.display = 'none';
    }
  });
  
  // Show requested view
  if (elements.views[viewName]) {
    elements.views[viewName].style.display = 'block';
  }
}

function showError(message) {
  if (elements.display.errorText) {
    elements.display.errorText.textContent = message || 'An unexpected error occurred';
  }
  showView('error');
}

function showToast(message, type = 'info') {
  // Remove existing toast
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Create new toast
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.classList.add('visible');
  }, 10);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Set up loading timeout
let loadingTimeout;
function startLoadingTimeout(seconds = 10) {
  clearLoadingTimeout();
  
  loadingTimeout = setTimeout(() => {
    logger.warn('Loading timed out');
    showError('Loading timed out. Please try again or reload the extension.');
  }, seconds * 1000);
  
  return loadingTimeout;
}

function clearLoadingTimeout() {
  if (loadingTimeout) {
    clearTimeout(loadingTimeout);
    loadingTimeout = null;
  }
}

// Check if the current tab is on a supported platform
async function checkCurrentTab() {
  try {
    // Get the current active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tabs || !tabs.length || !tabs[0].url) {
      logger.log('No active tab or URL found');
      updatePlatformInfo(false);
      return false;
    }
    
    const currentUrl = tabs[0].url;
    const supportedPlatform = SUPPORTED_DOMAINS.find(domain => 
      domain.pattern.test(currentUrl)
    );
    
    if (supportedPlatform) {
      logger.log(`Supported platform detected: ${supportedPlatform.name}`);
      updatePlatformInfo(true, supportedPlatform.name);
      return true;
    } else {
      logger.log(`No supported platform detected for URL: ${currentUrl}`);
      updatePlatformInfo(false);
      return false;
    }
  } catch (error) {
    logger.error('Error checking current tab:', error);
    updatePlatformInfo(false);
    return false;
  }
}

// Update platform info display
function updatePlatformInfo(isSupported, platformName = '') {
  if (!elements.display.platformInfo || !elements.display.platformName || !elements.buttons.scanPage) {
    return;
  }
  
  if (isSupported) {
    elements.display.platformInfo.style.display = 'block';
    elements.display.platformName.textContent = platformName;
    elements.buttons.scanPage.disabled = false;
    elements.buttons.scanPage.title = "Scan images from this page";
  } else {
    elements.display.platformInfo.style.display = 'none';
    elements.buttons.scanPage.disabled = true;
    elements.buttons.scanPage.title = "You must be on a supported platform";
  }
}

// Authentication functions
async function handleGoogleLogin() {
  try {
    showView('loading');
    startLoadingTimeout();
    
    logger.log('Initiating Google login');
    await authService.signInWithGoogle();
    
    // The actual auth happens in a separate tab, so we'll just wait
    // for that tab to complete and update our UI on success
    
    showToast('Google authentication initiated. Please complete the login in the opened tab.', 'info');
  } catch (error) {
    clearLoadingTimeout();
    logger.error('Error initiating Google login:', error);
    showError('Failed to start Google login. Please try again.');
  }
}

async function handleEmailPasswordLogin() {
  try {
    const email = elements.inputs.email.value.trim();
    const password = elements.inputs.password.value;
    
    if (!email || !password) {
      showToast('Please enter both email and password', 'error');
      return;
    }
    
    showView('loading');
    startLoadingTimeout();
    
    logger.log('Attempting email login');
    const result = await authService.signInWithEmailPassword(email, password);
    
    clearLoadingTimeout();
    
    if (result.success) {
      showToast('Successfully logged in!', 'success');
      await initializeAuthenticatedUI();
    } else {
      logger.error('Email login failed:', result.error);
      showError(result.error || 'Login failed. Please check your credentials.');
    }
  } catch (error) {
    clearLoadingTimeout();
    logger.error('Error in email/password login:', error);
    showError(error.message || 'Login failed. Please try again.');
  }
}

async function handleLogout() {
  try {
    showView('loading');
    
    logger.log('Logging out');
    await authService.signOut();
    
    showView('login');
    showToast('Successfully logged out', 'success');
  } catch (error) {
    logger.error('Error logging out:', error);
    showError('Failed to log out. Please try again.');
  }
}

// Initialize authenticated UI
async function initializeAuthenticatedUI() {
  try {
    const user = await authService.getUser();
    
    if (!user) {
      logger.warn('No user found after authentication');
      showView('login');
      return;
    }
    
    // Set user email in UI
    if (elements.display.userEmail) {
      elements.display.userEmail.textContent = user.email || 'User';
    }
    
    // Check if current tab is on supported platform
    await checkCurrentTab();
    
    // Show main view
    showView('main');
  } catch (error) {
    logger.error('Error initializing authenticated UI:', error);
    showError('Error loading user data. Please try again.');
  }
}

// Action handlers
async function handleScanPage() {
  try {
    const isAuthenticated = await authService.isAuthenticated();
    
    if (!isAuthenticated) {
      showToast('Please log in first', 'error');
      showView('login');
      return;
    }
    
    if (elements.buttons.scanPage.disabled) {
      showToast('You must be on a supported platform', 'error');
      return;
    }
    
    showToast('Scanning page for AI images...', 'info');
    
    // Send message to content script to scan the page
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tabs || !tabs.length) {
      showToast('No active tab found', 'error');
      return;
    }
    
    chrome.tabs.sendMessage(tabs[0].id, { action: 'scanPage' }, (response) => {
      if (chrome.runtime.lastError) {
        logger.error('Error sending message to content script:', chrome.runtime.lastError);
        showToast('Failed to start scanning. Please try again.', 'error');
      } else if (response && response.success) {
        showToast('Scanning started successfully', 'success');
        
        // Show status
        if (elements.display.statusMessage) {
          elements.display.statusMessage.textContent = 'Scanning in progress...';
        }
        
        // Close popup after a delay
        setTimeout(() => window.close(), 1500);
      } else {
        showToast('Failed to start scanning', 'error');
      }
    });
  } catch (error) {
    logger.error('Error handling scan page:', error);
    showToast('An error occurred. Please try again.', 'error');
  }
}

async function handleOpenGallery() {
  try {
    // Send message to background script to open gallery
    chrome.runtime.sendMessage({ action: 'openGallery' }, (response) => {
      if (chrome.runtime.lastError) {
        logger.error('Error opening gallery:', chrome.runtime.lastError);
        showToast('Failed to open gallery. Please try again.', 'error');
      } else if (response && response.error) {
        logger.error('Error opening gallery:', response.error);
        showToast(response.error, 'error');
      } else {
        // Close popup after requesting to open gallery
        window.close();
      }
    });
  } catch (error) {
    logger.error('Error opening gallery:', error);
    showToast('Failed to open gallery. Please try again.', 'error');
  }
}

// Initialize popup
async function initializePopup() {
  try {
    showView('loading');
    startLoadingTimeout(15); // 15 seconds timeout
    
    // Set up image error handling
    setupImageErrorHandling();
    
    // Preload critical images
    await preloadCriticalImages();
    
    // Validate extension
    const validationResults = await validateExtension();
    
    if (!validationResults.overall) {
      logger.warn('Extension validation failed:', validationResults);
      showValidationWarnings(validationResults);
    }
    
    // Try to get user's authentication status
    try {
      // Sync auth state with server
      await syncAuthState();
      
      const isAuthenticated = await authService.isAuthenticated();
      
      if (isAuthenticated) {
        logger.log('User is authenticated');
        await initializeAuthenticatedUI();
      } else {
        logger.log('User is not authenticated');
        showView('login');
      }
    } catch (authError) {
      logger.error('Error checking auth status:', authError);
      showView('login');
    }
    
    clearLoadingTimeout();
  } catch (error) {
    clearLoadingTimeout();
    logger.error('Error initializing popup:', error);
    showError('Failed to initialize. Please try again or reload the extension.');
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Initialize UI
  initializePopup();
  
  // Set up button event listeners
  if (elements.buttons.googleLogin) {
    elements.buttons.googleLogin.addEventListener('click', handleGoogleLogin);
  }
  
  if (elements.buttons.emailLogin) {
    elements.buttons.emailLogin.addEventListener('click', handleEmailPasswordLogin);
  }
  
  if (elements.buttons.tryAgain) {
    elements.buttons.tryAgain.addEventListener('click', () => {
      showView('login');
    });
  }
  
  if (elements.buttons.logout) {
    elements.buttons.logout.addEventListener('click', handleLogout);
  }
  
  if (elements.buttons.openGallery) {
    elements.buttons.openGallery.addEventListener('click', handleOpenGallery);
  }
  
  if (elements.buttons.scanPage) {
    elements.buttons.scanPage.addEventListener('click', handleScanPage);
  }
  
  // Allow pressing Enter in password field to submit
  if (elements.inputs.password) {
    elements.inputs.password.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleEmailPasswordLogin();
      }
    });
  }
  
  // Handle global errors
  window.addEventListener('error', (event) => {
    logger.error('Uncaught error:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
    
    showToast('An unexpected error occurred', 'error');
    return false;
  });
  
  // Listen for auth state changes from background script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'authStatusChanged') {
      logger.log('Auth status changed:', message.isAuthenticated);
      
      if (message.isAuthenticated) {
        initializeAuthenticatedUI();
      } else {
        showView('login');
      }
    }
  });
});

// Add toast styles
const style = document.createElement('style');
style.textContent = `
.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%) translateY(100px);
  padding: 8px 16px;
  border-radius: 4px;
  background-color: #1A1F2C;
  color: white;
  font-size: 14px;
  z-index: 1000;
  opacity: 0;
  transition: transform 0.3s, opacity 0.3s;
  max-width: 90%;
  text-align: center;
}

.toast.visible {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
}

.toast.success {
  background-color: #10b981;
}

.toast.error {
  background-color: #ef4444;
}

.toast.warning {
  background-color: #f97316;
}

.toast.info {
  background-color: #9b87f5;
}
`;
document.head.appendChild(style);
