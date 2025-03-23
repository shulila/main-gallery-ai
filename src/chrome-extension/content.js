// This script runs in the context of the AI platform websites

// Platform-specific selectors and logic
const PLATFORM_CONFIGS = {
  midjourney: {
    galleryDetectionSelectors: ['.feed', '.gallery', '.grid'],
    imageSelectors: ['.image-grid', '.image-item', '.artwork'],
    metadataSelectors: {
      prompt: '.prompt-text', 
      model: '.model-name',
      jobId: '.job-id'
    }
  },
  dalle: {
    galleryDetectionSelectors: ['.generated-images', '.gallery-view'],
    imageSelectors: ['.image-tile', '.image-card'],
    metadataSelectors: {
      prompt: '.prompt-text',
      model: '.model-name'
    }
  },
  stableDiffusion: {
    galleryDetectionSelectors: ['.gallery-grid', '.image-gallery'],
    imageSelectors: ['.image-card', '.image-item'],
    metadataSelectors: {
      prompt: '.prompt',
      model: '.model',
      seed: '.seed-value'
    }
  },
  runway: {
    galleryDetectionSelectors: ['.gallery', '.creations-list'],
    imageSelectors: ['.creation-card', '.video-card', '.image-card'],
    metadataSelectors: {
      prompt: '.prompt-text',
      model: '.model-name'
    }
  },
  pika: {
    galleryDetectionSelectors: ['.creations-grid', '.gallery'],
    imageSelectors: ['.video-card', '.creation-item'],
    metadataSelectors: {
      prompt: '.prompt',
      model: '.model-name'
    }
  }
};

// Inject "Add to Main Gallery" button
function injectGalleryButton() {
  // Detect which platform we're on
  const platform = detectPlatform();
  if (!platform) return;
  
  console.log(`MainGallery: Detected ${platform} gallery`);
  
  // Check if button or status indicator already exists
  if (document.querySelector('.main-gallery-connect-btn') || 
      document.querySelector('.main-gallery-status-indicator')) {
    return;
  }

  // Check if platform is already connected
  checkPlatformConnection(platform).then(isConnected => {
    if (isConnected) {
      // If already connected, show status indicator instead of button
      injectStatusIndicator(platform);
    } else {
      // If not connected, inject the button
      injectConnectButton(platform);
    }
  });
}

// Inject status indicator when platform is already connected
function injectStatusIndicator(platform) {
  const indicator = document.createElement('div');
  indicator.className = 'main-gallery-status-indicator';
  indicator.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span>Connected to Main Gallery</span>
  `;
  
  // Style the indicator
  const style = document.createElement('style');
  style.textContent = `
    .main-gallery-status-indicator {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 8px;
      background-color: #10b981;
      color: white;
      border: none;
      border-radius: 20px;
      padding: 8px 12px;
      font-size: 13px;
      font-weight: 500;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      opacity: 0.9;
    }
    .main-gallery-status-indicator svg {
      width: 16px;
      height: 16px;
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(indicator);
  
  // Auto-hide after 10 seconds
  setTimeout(() => {
    indicator.style.opacity = '0';
    indicator.style.transition = 'opacity 0.5s ease';
    setTimeout(() => indicator.remove(), 500);
  }, 10000);
}

// Inject the connect button
function injectConnectButton(platform) {
  // Create floating action button
  const button = document.createElement('button');
  button.className = 'main-gallery-connect-btn';
  button.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    Add to Main Gallery
  `;
  
  // Style the button
  const style = document.createElement('style');
  style.textContent = `
    .main-gallery-connect-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 8px;
      background-color: #7c3aed;
      color: white;
      border: none;
      border-radius: 20px;
      padding: 10px 16px;
      font-weight: 500;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      transition: all 0.2s;
    }
    .main-gallery-connect-btn:hover {
      background-color: #6d28d9;
      transform: translateY(-2px);
    }
    .main-gallery-connect-btn svg {
      width: 20px;
      height: 20px;
    }
    .main-gallery-connect-btn.success {
      background-color: #10b981;
    }
    .main-gallery-connect-btn.error {
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
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(button);
  
  // Add click event
  button.addEventListener('click', async () => {
    console.log("Clicked Add to Main Gallery");
    
    // Check authentication
    const isAuthenticated = await checkUserAuthentication();
    
    if (!isAuthenticated) {
      showToast("Please log in to add to Main Gallery");
      button.classList.add('error');
      
      // Open authentication page after a brief delay
      setTimeout(() => {
        openAuthPage();
      }, 1000);
      
      setTimeout(() => {
        button.classList.remove('error');
      }, 3000);
      return;
    }
    
    // Get current page data
    const pageData = collectPageData(platform);
    
    // Send data to background script to make API call
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'addToGallery',
        data: pageData
      });
      
      if (response && response.success) {
        // Update UI to show success
        const originalText = button.innerHTML;
        button.classList.add('success');
        button.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Added to Gallery
        `;
        
        // Show toast notification
        showToast("Successfully added to Main Gallery");
        
        // Revert button after 3 seconds
        setTimeout(() => {
          button.innerHTML = originalText;
          button.classList.remove('success');
        }, 3000);
      } else {
        throw new Error(response.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error adding to gallery:', error);
      button.classList.add('error');
      showToast("Failed to add to Main Gallery");
      
      setTimeout(() => {
        button.classList.remove('error');
      }, 3000);
    }
  });
}

// Open authentication page with redirect to current page
function openAuthPage() {
  const currentUrl = encodeURIComponent(window.location.href);
  chrome.runtime.sendMessage({
    action: 'openAuthPage',
    redirectUrl: currentUrl
  });
}

// Check if platform is already connected
async function checkPlatformConnection(platformId) {
  return new Promise(resolve => {
    chrome.storage.sync.get([PLATFORMS[platformId]?.tokenStorageKey], result => {
      resolve(!!result[PLATFORMS[platformId]?.tokenStorageKey]);
    });
  });
}

// Show toast notification
function showToast(message) {
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

// Check user authentication status
async function checkUserAuthentication() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['main_gallery_auth_token'], result => {
      resolve(!!result.main_gallery_auth_token);
    });
  });
}

// Collect data from the current page
function collectPageData(platformId) {
  const url = window.location.href;
  const title = document.title;
  const platformConfig = PLATFORM_CONFIGS[platformId];
  const data = {
    url,
    title,
    platformId,
    timestamp: new Date().toISOString(),
    metadata: {}
  };
  
  // Try to extract platform-specific metadata if available
  if (platformConfig && platformConfig.metadataSelectors) {
    for (const [key, selector] of Object.entries(platformConfig.metadataSelectors)) {
      const element = document.querySelector(selector);
      if (element) {
        data.metadata[key] = element.textContent.trim();
      }
    }
  }
  
  return data;
}

function detectPlatform() {
  const url = window.location.href;
  
  if (url.includes('midjourney.com') || (url.includes('discord.com') && url.includes('midjourney'))) {
    return 'midjourney';
  } else if (url.includes('openai.com')) {
    return 'dalle';
  } else if (url.includes('dreamstudio.ai') || url.includes('stability.ai')) {
    return 'stableDiffusion';
  } else if (url.includes('runwayml.com')) {
    return 'runway';
  } else if (url.includes('pika.art')) {
    return 'pika';
  }
  
  return null;
}

// Run on page load
injectGalleryButton();

// Re-check when DOM changes (for SPAs)
const observer = new MutationObserver(() => {
  setTimeout(injectGalleryButton, 500);
});

observer.observe(document.body, { 
  childList: true, 
  subtree: true 
});

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'scanGallery') {
    const platform = detectPlatform();
    if (!platform) {
      sendResponse({ success: false, error: 'Not a supported platform' });
      return;
    }
    
    // Implement gallery scanning logic here
    sendResponse({ success: true, platform });
  } else if (message.action === 'platformConnected' || message.action === 'platformDisconnected') {
    // Refresh the UI when platform connection status changes
    const platform = detectPlatform();
    if (platform) {
      setTimeout(() => {
        // Remove existing button or indicator
        const existingButton = document.querySelector('.main-gallery-connect-btn');
        const existingIndicator = document.querySelector('.main-gallery-status-indicator');
        
        if (existingButton) existingButton.remove();
        if (existingIndicator) existingIndicator.remove();
        
        // Re-inject based on current state
        injectGalleryButton();
      }, 500);
    }
  }
  
  return true; // Indicate async response
});
