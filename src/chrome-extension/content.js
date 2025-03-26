// This script runs in the context of the AI platform websites
console.log('MainGallery: Content script loaded and running');

// Update the button colors to match the brand
const BRAND_BLUE = '#0077ED';
const BRAND_GREEN = '#10b981';

// Platform-specific selectors and logic
const PLATFORM_CONFIGS = {
  midjourney: {
    name: 'Midjourney',
    icon: 'icons/midjourney.png',
    urlPatterns: [/midjourney\.com/, /discord\.com\/channels.*midjourney/],
    tokenStorageKey: 'midjourney_token',
    galleryDetectionSelectors: ['.feed', '.gallery', '.grid'],
    imageSelectors: ['.image-grid', '.image-item', '.artwork'],
    metadataSelectors: {
      prompt: '.prompt-text', 
      model: '.model-name',
      jobId: '.job-id'
    }
  },
  dalle: {
    name: 'DALL·E',
    icon: 'icons/dalle.png',
    urlPatterns: [/openai\.com/],
    tokenStorageKey: 'dalle_token',
    galleryDetectionSelectors: ['.generated-images', '.gallery-view'],
    imageSelectors: ['.image-tile', '.image-card'],
    metadataSelectors: {
      prompt: '.prompt-text',
      model: '.model-name'
    }
  },
  stableDiffusion: {
    name: 'Stable Diffusion',
    icon: 'icons/stablediffusion.png',
    urlPatterns: [/dreamstudio\.ai/, /stability\.ai/],
    tokenStorageKey: 'sd_token',
    galleryDetectionSelectors: ['.gallery-grid', '.image-gallery'],
    imageSelectors: ['.image-card', '.image-item'],
    metadataSelectors: {
      prompt: '.prompt',
      model: '.model',
      seed: '.seed-value'
    }
  },
  runway: {
    name: 'Runway',
    icon: 'icons/runway.png',
    urlPatterns: [/runwayml\.com/],
    tokenStorageKey: 'runway_token',
    galleryDetectionSelectors: ['.gallery', '.creations-list'],
    imageSelectors: ['.creation-card', '.video-card', '.image-card'],
    metadataSelectors: {
      prompt: '.prompt-text',
      model: '.model-name'
    }
  },
  pika: {
    name: 'Pika',
    icon: 'icons/pika.png',
    urlPatterns: [/pika\.art/],
    tokenStorageKey: 'pika_token',
    galleryDetectionSelectors: ['.creations-grid', '.gallery'],
    imageSelectors: ['.video-card', '.creation-item'],
    metadataSelectors: {
      prompt: '.prompt',
      model: '.model-name'
    }
  },
  leonardo: {
    name: 'Leonardo.ai',
    icon: 'icons/leonardo.png',
    urlPatterns: [/leonardo\.ai/],
    tokenStorageKey: 'leonardo_token',
    galleryDetectionSelectors: ['.gallery-container', '.generations-gallery'],
    imageSelectors: ['.generation-item', '.image-card'],
    metadataSelectors: {
      prompt: '.prompt-text',
      model: '.model-name'
    }
  }
};

// Immediately notify background script that the content script is loaded
chrome.runtime.sendMessage({ 
  action: 'contentScriptLoaded',
  url: window.location.href
}, response => {
  if (chrome.runtime.lastError) {
    console.error('Error sending contentScriptLoaded message:', chrome.runtime.lastError.message);
    // Continue anyway - background might not be ready yet
    detectAndInjectButton();
  } else if (response && response.success) {
    console.log('MainGallery: Background confirmed detection of', response.platformId);
    // Continue with platform-specific logic
    detectAndInjectButton();
  } else {
    console.log('MainGallery: Not a supported platform or no response from background');
  }
});

// Main function to detect platform and inject UI
function detectAndInjectButton() {
  console.log('MainGallery: Running detectAndInjectButton()');
  
  // Detect which platform we're on
  const platform = detectPlatform();
  if (!platform) {
    console.log('MainGallery: No supported platform detected');
    return;
  }
  
  console.log(`MainGallery: Detected ${platform.name} gallery`);
  
  // Check if button or status indicator already exists
  if (document.querySelector('.main-gallery-button')) {
    console.log('MainGallery: Button already exists');
    return;
  }

  // Check if user is logged into the platform
  checkPlatformLogin(platform).then(isPlatformLoggedIn => {
    if (!isPlatformLoggedIn) {
      console.log('MainGallery: User not logged into platform');
      // Wait for platform login, or show tooltip guiding to login first
      showPlatformLoginPrompt(platform);
      return;
    }
    
    // Check authentication status for MainGallery
    checkUserAuthentication().then(isMainGalleryLoggedIn => {
      console.log('MainGallery auth status:', { isMainGalleryLoggedIn, isPlatformLoggedIn });
      
      if (isMainGalleryLoggedIn) {
        injectGalleryButton(platform, 'go');
      } else {
        injectGalleryButton(platform, 'add');
      }
    });
  });
}

// Show a prompt to login to the platform first
function showPlatformLoginPrompt(platform) {
  const prompt = document.createElement('div');
  prompt.className = 'main-gallery-login-prompt';
  prompt.innerHTML = `
    <div class="main-gallery-tooltip">
      Please log in to ${platform.name} to connect with Main Gallery
    </div>
  `;
  
  // Style the prompt
  const style = document.createElement('style');
  style.textContent = `
    .main-gallery-login-prompt {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      padding: 12px;
      background-color: rgba(255, 255, 255, 0.9);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      max-width: 300px;
    }
    .main-gallery-tooltip {
      color: #1f2937;
      text-align: center;
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(prompt);
  
  // Auto-hide after 8 seconds
  setTimeout(() => {
    prompt.style.opacity = '0';
    prompt.style.transition = 'opacity 0.5s ease';
    setTimeout(() => prompt.remove(), 500);
  }, 8000);
}

// Inject the gallery button with the appropriate behavior
function injectGalleryButton(platform, mode) {
  // Create floating action button
  const button = document.createElement('button');
  button.className = 'main-gallery-button';
  
  // Set different content based on mode
  if (mode === 'add') {
    button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Add to Main Gallery
    `;
  } else { // go mode
    button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Go to Main Gallery
    `;
  }
  
  // Style the button
  const style = document.createElement('style');
  style.textContent = `
    .main-gallery-button {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 8px;
      background-color: ${BRAND_BLUE};
      color: white;
      border: none;
      border-radius: 20px;
      padding: 10px 16px;
      font-weight: 500;
      font-size: 14px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      transition: all 0.2s;
      opacity: 0.95;
    }
    .main-gallery-button:hover {
      background-color: #0062c4;
      transform: translateY(-2px);
      opacity: 1;
    }
    .main-gallery-button svg {
      width: 20px;
      height: 20px;
    }
    .main-gallery-button.success {
      background-color: ${BRAND_GREEN};
    }
    .main-gallery-button.error {
      background-color: #ef4444;
    }
    .main-gallery-toast {
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #1f2937;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      z-index: 10001;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateY(-10px);
      opacity: 0;
      transition: all 0.3s ease;
    }
    .main-gallery-toast.show {
      transform: translateY(0);
      opacity: 1;
    }
    .main-gallery-onboarding {
      position: fixed;
      bottom: 80px;
      right: 20px;
      background-color: white;
      border-radius: 8px;
      padding: 16px;
      max-width: 280px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      color: #1f2937;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      z-index: 10001;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
    }
    .main-gallery-onboarding.show {
      opacity: 1;
      transform: translateY(0);
    }
    .main-gallery-onboarding-close {
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      cursor: pointer;
      color: #9ca3af;
    }
    .main-gallery-onboarding-close:hover {
      color: #4b5563;
    }
    .main-gallery-onboarding-title {
      font-weight: 600;
      margin-bottom: 8px;
    }
    .main-gallery-onboarding-content {
      margin-bottom: 12px;
      line-height: 1.5;
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(button);
  
  // Add click event based on mode
  button.addEventListener('click', async () => {
    if (mode === 'add') {
      await handleAddToGallery(button, platform);
    } else { // go mode
      openGallery();
    }
  });
  
  // Show onboarding tooltip on first visit
  chrome.storage.local.get(['onboarding_shown'], result => {
    if (!result.onboarding_shown) {
      showOnboardingTooltip();
      chrome.storage.local.set({ onboarding_shown: true });
    }
  });
}

// Handle the "Add to Gallery" action
async function handleAddToGallery(button, platform) {
  // Check if user is logged into Main Gallery
  const isLoggedIn = await checkUserAuthentication();
  
  if (!isLoggedIn) {
    // If not logged in, prompt to sign in first
    showToast("Please log in to Main Gallery");
    openAuthPage();
    return;
  }
  
  // Get current page data
  const pageData = collectPageData(platform);
  
  // Send data to background script to make API call
  try {
    button.disabled = true;
    button.innerHTML = `
      <svg class="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" stroke-dasharray="32" stroke-dashoffset="12" />
      </svg>
      Adding...
    `;
    
    const response = await chrome.runtime.sendMessage({
      action: 'addToGallery',
      data: pageData
    });
    
    if (response && response.success) {
      // Update UI to show success
      button.classList.add('success');
      button.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Added Successfully
      `;
      
      // Show toast notification
      showToast("Successfully added to Main Gallery");
      
      // Change to "Go to Gallery" button after a delay
      setTimeout(() => {
        button.classList.remove('success');
        button.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Go to Main Gallery
        `;
        
        // Update click handler
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        newButton.addEventListener('click', openGallery);
      }, 2000);
    } else {
      throw new Error(response.error || 'Unknown error');
    }
  } catch (error) {
    console.error('Error adding to gallery:', error);
    button.classList.add('error');
    button.innerHTML = `Error`;
    showToast("Failed to add to Main Gallery");
    
    setTimeout(() => {
      button.classList.remove('error');
      button.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Add to Main Gallery
      `;
      button.disabled = false;
    }, 3000);
  }
}

// Show the onboarding tooltip
function showOnboardingTooltip() {
  const onboarding = document.createElement('div');
  onboarding.className = 'main-gallery-onboarding';
  onboarding.innerHTML = `
    <button class="main-gallery-onboarding-close">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <div class="main-gallery-onboarding-title">Welcome to Main Gallery!</div>
    <div class="main-gallery-onboarding-content">
      Connect your AI platforms and collect all your creations in one place. Click the button below to get started.
    </div>
  `;
  
  document.body.appendChild(onboarding);
  
  // Animate in
  setTimeout(() => {
    onboarding.classList.add('show');
  }, 300);
  
  // Add close button functionality
  const closeButton = onboarding.querySelector('.main-gallery-onboarding-close');
  closeButton.addEventListener('click', () => {
    onboarding.classList.remove('show');
    setTimeout(() => onboarding.remove(), 300);
  });
  
  // Auto-hide after 15 seconds
  setTimeout(() => {
    if (document.body.contains(onboarding)) {
      onboarding.classList.remove('show');
      setTimeout(() => {
        if (document.body.contains(onboarding)) {
          onboarding.remove();
        }
      }, 300);
    }
  }, 15000);
}

// Open authentication page with redirect to current page
function openAuthPage() {
  const currentUrl = encodeURIComponent(window.location.href);
  chrome.runtime.sendMessage({
    action: 'openAuthPage',
    redirectUrl: currentUrl
  });
}

// Function to open the gallery in a new tab
function openGallery() {
  chrome.runtime.sendMessage({
    action: 'openGallery'
  });
}

// Show toast notification
function showToast(message) {
  console.log('MainGallery Toast:', message);
  
  // Remove any existing toasts
  const existingToast = document.querySelector('.main-gallery-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'main-gallery-toast';
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

// Check user authentication status with Main Gallery
async function checkUserAuthentication() {
  console.log('MainGallery: Checking user authentication');
  return new Promise(resolve => {
    chrome.storage.sync.get(['main_gallery_auth_token'], result => {
      const isLoggedIn = !!result.main_gallery_auth_token;
      console.log('MainGallery: User authentication status:', isLoggedIn);
      resolve(isLoggedIn);
    });
  });
}

// Collect data from the current page
function collectPageData(platform) {
  const url = window.location.href;
  const title = document.title || 'AI Creation';
  const data = {
    url,
    title,
    platformId: platform.id,
    timestamp: new Date().toISOString(),
    metadata: {}
  };
  
  // Try to extract platform-specific metadata if available
  if (platform.metadataSelectors) {
    for (const [key, selector] of Object.entries(platform.metadataSelectors)) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          data.metadata[key] = element.textContent.trim();
        }
      } catch (error) {
        console.error(`Error extracting ${key} metadata:`, error);
        // Continue with other metadata
      }
    }
  }
  
  return data;
}

// Platform detection function
function detectPlatform() {
  const url = window.location.href;
  console.log('MainGallery: Checking URL for platform detection:', url);
  
  for (const [id, platform] of Object.entries(PLATFORM_CONFIGS)) {
    for (const pattern of platform.urlPatterns) {
      if (pattern.test(url)) {
        console.log('MainGallery: Platform detected:', id);
        return { id, ...platform };
      }
    }
  }
  
  console.log('MainGallery: No platform detected');
  return null;
}

// Check if user is logged into the platform
function checkPlatformLogin(platform) {
  console.log('MainGallery: Checking platform login for', platform.name);
  
  // Each platform has different indicators for logged-in state
  // This is a simplified version - you may need to adjust for specific platforms
  if (platform.id === 'midjourney') {
    // For Midjourney, check for user profile elements
    return Promise.resolve(!!document.querySelector('.user-profile, .username, .user-avatar'));
  } else if (platform.id === 'leonardo') {
    // For Leonardo, check for personal gallery or settings access
    return Promise.resolve(!!document.querySelector('.user-menu, .account-section, .profile-link'));
  } else {
    // For other platforms, use a common approach
    const loggedInIndicators = [
      '.user-profile', 
      '.user-avatar',
      '.account-menu',
      '.user-name',
      '[data-testid="user-menu"]',
      '.logout-button'
    ];
    
    // Check if any of these selectors exist
    const isLoggedIn = loggedInIndicators.some(selector => !!document.querySelector(selector));
    return Promise.resolve(isLoggedIn);
  }
}

// Run platform detection immediately
detectAndInjectButton();

// Re-check when DOM changes (for SPAs) using a throttled observer
let throttleTimer;
const observer = new MutationObserver(() => {
  if (throttleTimer) return;
  throttleTimer = setTimeout(() => {
    throttleTimer = null;
    
    // Only inject if button doesn't exist
    if (!document.querySelector('.main-gallery-button')) {
      detectAndInjectButton();
    }
  }, 1000); // Throttle to once per second
});

// Start observing with a delay to ensure page is fully loaded
setTimeout(() => {
  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
  console.log('MainGallery: Started MutationObserver');
}, 1500);

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('MainGallery content script received message:', message.action);
  
  if (message.action === 'platformDetected') {
    console.log('MainGallery: Background script detected platform:', message.platformId);
    detectAndInjectButton();
    sendResponse({ success: true });
  } else if (message.action === 'updateUI') {
    // Remove existing button to refresh the UI state
    const existingButton = document.querySelector('.main-gallery-button');
    if (existingButton) {
      existingButton.remove();
    }
    detectAndInjectButton();
    sendResponse({ success: true });
  } else if (message.action === 'authStateChanged') {
    // Auth state changed, update the UI
    const existingButton = document.querySelector('.main-gallery-button');
    if (existingButton) {
      existingButton.remove();
    }
    detectAndInjectButton();
    sendResponse({ success: true });
  }
  
  return true; // Indicate async response
});

// Log that the content script has fully initialized
console.log('MainGallery: Content script initialization complete');
