
// Brand configuration to align with the main app
const BRAND = {
  name: "MainGallery.AI",
  urls: {
    baseUrl: "https://main-gallery-hub.lovable.app",
    auth: "/auth",
    gallery: "/gallery"
  }
};

// Import required utilities
import { isPreviewEnvironment, getBaseUrl, getAuthUrl, getGalleryUrl, isSupportedPlatformUrl } from './utils/urlUtils.js';
import { logger } from './utils/logger.js';
import { handleError } from './utils/errorHandler.js';

// Update gallery URL based on environment
const galleryUrl = getGalleryUrl();
const authUrl = getAuthUrl();

// Extension ID - important for OAuth flow
const EXTENSION_ID = chrome.runtime.id || 'oapmlmnmepbgiafhbbkjbkbppfdclknlb';

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

// Log environment for debugging
logger.log('MainGallery.AI popup initialized in', isPreviewEnvironment() ? 'PREVIEW' : 'PRODUCTION', 'environment');
logger.log('Base URL:', getBaseUrl());
logger.log('Auth URL:', authUrl);
logger.log('Gallery URL:', galleryUrl);
logger.log('Extension ID:', EXTENSION_ID);

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
    errorTextElement.textContent = message || 'Authentication failed. Please try again.';
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
    const isSupported = isSupportedPlatformUrl(currentUrl);
    
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
      
      platformNameElement.textContent = platformName;
      platformDetectedDiv.style.display = 'block';
      
      // Enable "Add to MainGallery" button with active styling
      if (scanPageBtn) {
        scanPageBtn.disabled = false;
        safelyRemoveClass(scanPageBtn, 'disabled');
        safelyAddClass(scanPageBtn, 'primary');
      }
      
      return true;
    } else {
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
    scanPageBtn.setAttribute('data-tooltip', 'Not on a supported AI platform');
    safelyAddClass(scanPageBtn, 'disabled');
    safelyRemoveClass(scanPageBtn, 'primary');
  }
}

// Improved Google OAuth login using chrome.identity
async function handleInPopupGoogleLogin() {
  try {
    if (states.loading) showState(states.loading);
    logger.log('Starting Google login flow with chrome.identity');
    
    // Get client ID from manifest
    const manifest = chrome.runtime.getManifest();
    const clientId = manifest.oauth2?.client_id || 
                  '288496481194-rk8jtjt5vka8j90eofdki6q4fgjp2799.apps.googleusercontent.com';
    
    // Get extension redirect URL
    const redirectURL = chrome.identity.getRedirectURL();
    logger.log('Chrome identity redirect URL:', redirectURL);
    
    // Build OAuth URL with proper scopes
    const scopes = ['openid', 'email', 'profile'];
    const nonce = Math.random().toString(36).substring(2, 15);
    
    const authParams = new URLSearchParams({
      client_id: clientId,
      response_type: 'token id_token',
      redirect_uri: redirectURL,
      scope: scopes.join(' '),
      nonce: nonce,
      prompt: 'select_account',
    });
    
    const authURL = `https://accounts.google.com/o/oauth2/auth?${authParams.toString()}`;
    
    logger.log('Auth URL for chrome.identity:', authURL);
    
    try {
      // Launch the identity flow
      const responseUrl = await new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow(
          { 
            url: authURL, 
            interactive: true
          },
          (responseUrl) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            
            if (!responseUrl) {
              reject(new Error('The user did not approve access.'));
              return;
            }
            
            resolve(responseUrl);
          }
        );
      });
      
      logger.log('Auth response URL received');
      
      // Parse the response URL
      const url = new URL(responseUrl);
      
      // Get tokens from hash fragment
      const hashParams = new URLSearchParams(url.hash.substring(1));
      
      // Extract tokens and user info
      const accessToken = hashParams.get('access_token');
      const idToken = hashParams.get('id_token');
      
      if (!accessToken) {
        throw new Error('No access token received');
      }
      
      // Get user info from id_token or fetch it with the access token
      let userEmail = null;
      let userName = null;
      
      try {
        if (idToken) {
          // Parse the JWT to get user info
          const payload = JSON.parse(atob(idToken.split('.')[1]));
          userEmail = payload.email;
          userName = payload.name;
          logger.log('User info from ID token:', { email: userEmail });
        } else {
          // Use access token to fetch user info
          const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          
          if (userInfoResponse.ok) {
            const userInfo = await userInfoResponse.json();
            userEmail = userInfo.email;
            userName = userInfo.name;
            logger.log('User info from userinfo endpoint:', { email: userEmail });
          } else {
            throw new Error('Failed to fetch user info');
          }
        }
      } catch (userInfoError) {
        logger.error('Error getting user info:', userInfoError);
        // Continue even without email - we still have the token
        userEmail = 'User';
      }
      
      // Calculate token expiration (1 hour from now)
      const expiresIn = parseInt(hashParams.get('expires_in') || '3600', 10);
      const expiresAt = Date.now() + (expiresIn * 1000);
      
      // Store token info and user email for extension usage
      chrome.storage.sync.set({
        'main_gallery_auth_token': {
          access_token: accessToken,
          id_token: idToken,
          token_type: hashParams.get('token_type') || 'Bearer',
          timestamp: Date.now(),
          expires_at: expiresAt
        },
        'main_gallery_user_email': userEmail || 'User',
        'main_gallery_user_name': userName
      }, () => {
        logger.log('Auth tokens and user info stored successfully');
        
        // Show success notification
        showToast('Successfully signed in!', 'success');
        
        // Update UI to show logged-in state
        if (userEmailElement) {
          userEmailElement.textContent = userEmail || 'User';
        }
        
        showState(states.mainView);
        
        // Check if current tab is a supported platform
        checkCurrentTab();
        
        // Send message to background script to update other contexts
        chrome.runtime.sendMessage({ 
          action: 'updateUI',
          userEmail: userEmail,
          userName: userName 
        });
      });
    } catch (oauthError) {
      logger.error('OAuth error:', oauthError);
      
      // Show human-readable error
      let errorMessage = 'Authentication failed.';
      
      if (oauthError.message.includes('did not approve')) {
        errorMessage = 'You did not approve access to your Google account.';
      } else if (oauthError.message.includes('invalid_client')) {
        errorMessage = 'OAuth client configuration error. Please contact support.';
      } else if (oauthError.message.includes('cancel')) {
        errorMessage = 'Authentication was canceled.';
      } else if (oauthError.message.includes('access')) {
        errorMessage = 'Could not connect to Google. Please try again later.';
      }
      
      showError(errorMessage);
    }
  } catch (error) {
    logger.error('Error initiating Google login:', error);
    showError('Could not start login process. Please try again.');
  }
}

// Enhanced auth check with token validation
async function checkAuthAndRedirect() {
  try {
    if (states.loading) showState(states.loading);
    logger.log('Checking authentication status...');
    
    // Check authentication with the background script
    chrome.runtime.sendMessage({ action: 'isLoggedIn' }, async (response) => {
      try {
        // Handle no response (possible disconnection)
        if (!response) {
          logger.error('No response from background script');
          showToast('Connection error. Please try again.', 'error');
          showState(states.loginView);
          return;
        }
        
        const loggedIn = response && response.loggedIn;
        
        if (loggedIn) {
          logger.log('User is logged in, showing logged-in state');
          
          // Get user email to display
          chrome.runtime.sendMessage({ action: 'getUserEmail' }, (emailResponse) => {
            const userEmail = emailResponse && emailResponse.email;
            logger.log('User email:', userEmail);
            
            if (userEmail && userEmailElement) {
              userEmailElement.textContent = userEmail;
            }
            
            showState(states.mainView);
            
            // Check if current tab is a supported platform
            checkCurrentTab();
          });
        } else {
          logger.log('User is not logged in, showing login options');
          showState(states.loginView);
        }
      } catch (err) {
        logger.error('Error processing auth status:', err);
        showToast('Error checking login status', 'error');
        showState(states.loginView); // Default to login view
      }
    });
  } catch (error) {
    logger.error('Error checking auth status:', error);
    showToast('Connection error', 'error');
    showState(states.loginView); // Default to login view
  }
}

// Open gallery in new tab or focus existing tab
function openGallery() {
  try {
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
    
    // Send message to open the auth page
    chrome.runtime.sendMessage({ 
      action: 'openAuthPage',
      from: 'extension_popup'
    });
    
    // Close popup after a short delay
    setTimeout(() => window.close(), 300);
  } catch (error) {
    logger.error('Error opening web login:', error);
    showToast('Could not open login page. Please try again.', 'error');
    showState(states.loginView);
  }
}

// Log out the user
function logout() {
  chrome.runtime.sendMessage({ action: 'logout' }, response => {
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
    googleLoginBtn.addEventListener('click', handleInPopupGoogleLogin);
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
    logoutBtn.addEventListener('click', logout);
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
