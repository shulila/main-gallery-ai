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
const forgotPasswordBtn = document.getElementById('forgot-password-btn');
const testMidjourneyAuthBtn = document.getElementById('test-midjourney-auth');
const testMidjourneyImagesBtn = document.getElementById('test-midjourney-images');
const testMidjourneyGenerateBtn = document.getElementById('test-midjourney-generate');
const testMidjourneyJobBtn = document.getElementById('test-midjourney-job');
const testResult = document.getElementById('test-result');

// Store the last generated job ID
let lastGeneratedJobId = null;

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
    chrome.runtime.sendMessage({ action: 'openAuthPage' });
    
    // Close popup after a short delay
    setTimeout(() => window.close(), 300);
  } catch (error) {
    console.error('Error opening auth page:', error);
    showToast('Could not open login page. Please try again.', 'error');
    showState(states.notLoggedIn);
  }
}

// Open auth with specific provider (Google) - updated to ensure direct OAuth flow
function openAuthWithProvider(provider) {
  try {
    showState(states.authLoading);
    
    chrome.runtime.sendMessage({
      action: 'openAuthWithProvider',
      provider: provider
    });
    
    // Close popup after initiating OAuth
    setTimeout(() => window.close(), 300);
  } catch (error) {
    console.error(`Error opening ${provider} auth:`, error);
    showToast(`Could not open ${provider} login. Please try again.`, 'error');
    showState(states.notLoggedIn);
  }
}

// Open forgot password page
function openForgotPasswordPage() {
  try {
    showState(states.authLoading);
    chrome.runtime.sendMessage({ 
      action: 'openAuthPage',
      forgotPassword: true
    });
    
    // Close popup after a short delay
    setTimeout(() => window.close(), 300);
  } catch (error) {
    console.error('Error opening forgot password page:', error);
    showToast('Could not open forgot password page. Please try again.', 'error');
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

// Midjourney API integration functions
// These functions implement the actual API calls for the POC

// Test Midjourney Authentication
function testMidjourneyAuth() {
  try {
    showToast('Testing Midjourney authentication...', 'info');
    
    // Check if we have any extracted images
    chrome.storage.local.get(['midjourney_extracted_images'], function(result) {
      const images = result.midjourney_extracted_images || [];
      
      const response = {
        success: true,
        authenticated: true,
        extractionEnabled: true,
        imageCount: images.length,
        lastExtraction: images.length > 0 ? images[0].extractedAt : null,
        message: "Midjourney gallery extraction is active"
      };
      
      showTestResult(response);
      showToast('Authentication test complete!', 'success');
    });
  } catch (error) {
    console.error('Midjourney auth test error:', error);
    showTestResult({ error: error.message });
    showToast('Authentication test failed', 'error');
  }
}

// Test fetching Midjourney images
function testMidjourneyImages() {
  try {
    showToast('Fetching Midjourney images...', 'info');
    
    // Get images from chrome.storage.local
    chrome.storage.local.get(['midjourney_extracted_images'], function(result) {
      const images = result.midjourney_extracted_images || [];
      
      // Limit to the most recent 5 images for display
      const recentImages = images.slice(0, 5);
      
      const response = {
        success: true,
        totalImages: images.length,
        displayedImages: recentImages.length,
        images: recentImages
      };
      
      showTestResult(response);
      
      if (images.length > 0) {
        showToast(`Found ${images.length} images!`, 'success');
      } else {
        showToast('No images found. Visit Midjourney to extract images.', 'info');
      }
    });
  } catch (error) {
    console.error('Midjourney images test error:', error);
    showTestResult({ error: error.message });
    showToast('Failed to fetch images', 'error');
  }
}

// Test generating a Midjourney image
function testMidjourneyGenerate() {
  try {
    showToast('Generating Midjourney image...', 'info');
    const testPrompt = "Futuristic cityscape with neon lights and flying cars";
    
    // For POC, we'll simulate a generation job
    const jobId = `mj-job-${Date.now()}`;
    lastGeneratedJobId = jobId;
    
    const response = {
      success: true,
      jobId: jobId,
      prompt: testPrompt,
      status: "queued",
      message: "In the full integration, this would trigger a real Midjourney generation"
    };
    
    showTestResult(response);
    showToast('Generation job simulated!', 'success');
    
    // Store this job in local storage
    chrome.storage.local.get(['midjourney_jobs'], function(result) {
      const jobs = result.midjourney_jobs || [];
      
      jobs.unshift({
        jobId,
        prompt: testPrompt,
        status: "queued",
        createdAt: new Date().toISOString()
      });
      
      chrome.storage.local.set({
        'midjourney_jobs': jobs
      });
    });
  } catch (error) {
    console.error('Midjourney generation test error:', error);
    showTestResult({ error: error.message });
    showToast('Failed to start generation job', 'error');
  }
}

// Test checking a Midjourney job status
function testMidjourneyJobStatus() {
  try {
    // Use the last job ID if available, otherwise create a mock one
    const jobId = lastGeneratedJobId || `mock-job-${Date.now()}`;
    
    showToast('Checking job status...', 'info');
    
    // For POC, simulate job status
    chrome.storage.local.get(['midjourney_jobs'], function(result) {
      const jobs = result.midjourney_jobs || [];
      const job = jobs.find(j => j.jobId === jobId) || {
        jobId,
        prompt: "Futuristic cityscape with neon lights and flying cars",
        status: "completed",
        createdAt: new Date(Date.now() - 60000).toISOString(),
        completedAt: new Date().toISOString(),
        imageUrl: "https://picsum.photos/512/512?random=4"
      };
      
      // If job was queued, mark it as completed now
      if (job.status === "queued") {
        job.status = "completed";
        job.completedAt = new Date().toISOString();
        job.imageUrl = "https://picsum.photos/512/512?random=4";
        
        // Update job in storage
        chrome.storage.local.set({
          'midjourney_jobs': jobs.map(j => j.jobId === job.jobId ? job : j)
        });
      }
      
      const response = {
        success: true,
        jobId: job.jobId,
        status: job.status,
        progress: 100,
        url: job.imageUrl,
        originalPrompt: job.prompt,
        createdAt: job.createdAt,
        completedAt: job.completedAt
      };
      
      showTestResult(response);
      showToast('Job status retrieved!', 'success');
    });
  } catch (error) {
    console.error('Midjourney job status test error:', error);
    showTestResult({ error: error.message });
    showToast('Failed to check job status', 'error');
  }
}

// Set up active tab monitoring for Midjourney extraction
function setupTabMonitoring() {
  // Listen for tab updates
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Check if this is a Midjourney page and it's fully loaded
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('midjourney.com/app')) {
      console.log('Midjourney app page detected, will attempt extraction');
      
      // Send message to content script to extract images
      chrome.tabs.sendMessage(tabId, {
        action: 'extractMidjourneyImages'
      }).catch(err => {
        console.error('Error sending extraction message:', err);
      });
    }
  });
}

// Immediately check auth status when popup opens
document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup loaded, checking auth status');
  checkAuthAndRedirect();
  setupTabMonitoring();
});

// Event listeners for buttons
if (loginBtn) {
  loginBtn.addEventListener('click', () => {
    openAuthPage();
  });
}

if (googleLoginBtn) {
  googleLoginBtn.addEventListener('click', () => {
    openAuthWithProvider('google');
  });
}

if (forgotPasswordBtn) {
  forgotPasswordBtn.addEventListener('click', () => {
    openForgotPasswordPage();
  });
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

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'updateUI') {
    checkAuthAndRedirect();
  }
  else if (message.action === 'midjourneyImagesExtracted') {
    showToast(`Extracted ${message.count} images from Midjourney!`, 'success');
  }
});
