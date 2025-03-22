
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
  
  // Check if button already exists
  if (document.querySelector('.main-gallery-connect-btn')) {
    return;
  }
  
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
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(button);
  
  // Add click event
  button.addEventListener('click', () => {
    chrome.runtime.sendMessage({ 
      action: 'initiatePlatformConnection',
      platform: platform
    });
  });
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
    // This would extract images, prompts, and metadata
    
    sendResponse({ success: true, platform });
  }
});
