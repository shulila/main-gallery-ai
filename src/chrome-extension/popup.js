
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
const testMidjourneyAuthBtn = document.getElementById('test-midjourney-auth');
const testMidjourneyImagesBtn = document.getElementById('test-midjourney-images');
const testMidjourneyGenerateBtn = document.getElementById('test-midjourney-generate');
const testMidjourneyJobBtn = document.getElementById('test-midjourney-job');
const testResult = document.getElementById('test-result');
const syncStatusElement = document.getElementById('sync-status');
const syncNowButton = document.getElementById('sync-now');
const syncCountElement = document.getElementById('sync-image-count');

// Store the last generated job ID
let lastGeneratedJobId = null;
let isSyncing = false; // Track sync state

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

// Auto-redirect to gallery if logged in
async function checkAuthAndRedirect() {
  try {
    showState(states.authLoading); // Show loading state while checking
    
    const loggedIn = await isLoggedIn();
    
    if (loggedIn) {
      console.log('User is logged in, showing logged-in state');
      // Show logged in state instead of redirecting
      showState(states.loggedIn);
      updateSyncStatus(); // Update the Midjourney sync status
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

// Update Midjourney sync status
function updateSyncStatus() {
  if (!syncStatusElement || !syncCountElement) return;
  
  chrome.storage.local.get(['midjourney_extracted_images'], function(result) {
    const images = result.midjourney_extracted_images || [];
    const lastSync = images.length > 0 
      ? new Date(images[0].extractedAt).toLocaleTimeString() 
      : 'Never';
    
    syncStatusElement.textContent = `Last sync: ${lastSync}`;
    syncCountElement.textContent = `${images.length} images found`;
    
    // Update button state
    if (syncNowButton) {
      syncNowButton.disabled = isSyncing;
      syncNowButton.innerHTML = isSyncing ? 
        '<div class="button-spinner"></div> Syncing...' : 
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9a9 9 0 00-9-9m9 9V3"></path></svg>';
    }
  });
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

// Open auth with specific provider (Google) - updated for direct OAuth flow
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

// Show test results
function showTestResult(data) {
  if (testResult) {
    const pre = testResult.querySelector('pre');
    pre.textContent = JSON.stringify(data, null, 2);
    testResult.classList.remove('hidden');
  }
}

// Trigger manual sync of Midjourney images
function triggerMidjourneySync() {
  if (isSyncing) return; // Prevent multiple syncs
  
  isSyncing = true;
  updateSyncStatus(); // Update UI to show syncing state
  
  chrome.tabs.query({ url: "*://www.midjourney.com/app*" }, function(tabs) {
    if (tabs.length > 0) {
      // There's an open Midjourney tab, send sync message
      chrome.tabs.sendMessage(tabs[0].id, { 
        action: 'extractMidjourneyImages',
        forceSync: true
      });
      showToast('Syncing images from Midjourney...', 'info');
      
      // Update status after a delay
      setTimeout(() => {
        isSyncing = false;
        updateSyncStatus();
      }, 2000);
    } else {
      // No Midjourney tab open
      isSyncing = false;
      updateSyncStatus();
      showToast('No Midjourney tabs found. Please open Midjourney first.', 'error');
    }
  });
}

// Midjourney API integration functions
function testMidjourneyAuth() {
  chrome.runtime.sendMessage({ action: 'testMidjourneyAuth' }, function(response) {
    showTestResult(response);
    showToast('Authentication test complete!', response.success ? 'success' : 'error');
  });
}

function testMidjourneyImages() {
  chrome.runtime.sendMessage({ action: 'testMidjourneyImages' }, function(response) {
    showTestResult(response);
    
    if (response.success) {
      if (response.totalImages > 0) {
        showToast(`Found ${response.totalImages} images!`, 'success');
      } else {
        showToast('No images found. Visit Midjourney to extract images.', 'info');
      }
    } else {
      showToast('Failed to fetch images', 'error');
    }
  });
}

function testMidjourneyGenerate() {
  chrome.runtime.sendMessage({ action: 'testMidjourneyGenerate' }, function(response) {
    showTestResult(response);
    
    if (response.success) {
      lastGeneratedJobId = response.jobId;
      showToast('Generation job started!', 'success');
    } else {
      showToast('Failed to start generation job', 'error');
    }
  });
}

function testMidjourneyJobStatus() {
  chrome.runtime.sendMessage({ 
    action: 'testMidjourneyJobStatus',
    jobId: lastGeneratedJobId
  }, function(response) {
    showTestResult(response);
    showToast('Job status retrieved!', response.success ? 'success' : 'error');
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
  } else {
    console.warn('Login button not found in DOM');
  }
  
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', () => {
      console.log('Google login button clicked');
      openAuthWithProvider('google');
    });
    console.log('Google login button listener set up');
  } else {
    console.warn('Google login button not found in DOM');
  }
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
  
  if (testMidjourneyAuthBtn) {
    testMidjourneyAuthBtn.addEventListener('click', testMidjourneyAuth);
  }
  
  if (testMidjourneyImagesBtn) {
    testMidjourneyImagesBtn.addEventListener('click', testMidjourneyImages);
  }
  
  if (testMidjourneyGenerateBtn) {
    testMidjourneyGenerateBtn.addEventListener('click', testMidjourneyGenerate);
  }
  
  if (testMidjourneyJobBtn) {
    testMidjourneyJobBtn.addEventListener('click', testMidjourneyJobStatus);
  }
  
  if (syncNowButton) {
    syncNowButton.addEventListener('click', triggerMidjourneySync);
  }
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'updateUI') {
    checkAuthAndRedirect();
  }
  else if (message.action === 'midjourneyImagesExtracted') {
    isSyncing = false;
    showToast(`Extracted ${message.count} images from Midjourney!`, 'success');
    updateSyncStatus();
  }
});
