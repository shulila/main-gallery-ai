
// MainGallery Content Script
console.log('MainGallery content script loaded');

// Constants for platform detection
const PLATFORMS = {
  midjourney: {
    name: 'Midjourney',
    urlPatterns: [/midjourney\.com/, /discord\.com\/channels.*midjourney/],
    galleryPages: [/midjourney\.com\/organize/, /midjourney\.com\/archive/, /midjourney\.com\/feed/, /midjourney\.com\/app/, /midjourney\.com\/app\/users\//]
  },
  dalle: {
    name: 'DALL·E',
    urlPatterns: [/openai\.com/],
    galleryPages: [/openai\.com\/create/, /openai\.com\/collection/]
  },
  stableDiffusion: {
    name: 'Stable Diffusion',
    urlPatterns: [/dreamstudio\.ai/, /stability\.ai/],
    galleryPages: [/dreamstudio\.ai\/gallery/, /dreamstudio\.ai\/workspace/]
  },
  runway: {
    name: 'Runway',
    urlPatterns: [/runwayml\.com/],
    galleryPages: [/runwayml\.com\/projects/, /runwayml\.com\/assets/]
  },
  pika: {
    name: 'Pika',
    urlPatterns: [/pika\.art/],
    galleryPages: [/pika\.art\/profile/, /pika\.art\/videos/]
  },
  leonardo: {
    name: 'Leonardo.ai',
    urlPatterns: [/leonardo\.ai/],
    galleryPages: [/leonardo\.ai\/gallery/, /leonardo\.ai\/generations/, /leonardo\.ai\/library/, /app\.leonardo\.ai/]
  }
};

// Check if current URL matches platform and page type
function detectPlatform() {
  const url = window.location.href;
  
  for (const [id, platform] of Object.entries(PLATFORMS)) {
    for (const pattern of platform.urlPatterns) {
      if (pattern.test(url)) {
        return { id, ...platform };
      }
    }
  }
  
  return null;
}

// Check if current URL is a gallery page
function isGalleryPage(platformId) {
  const url = window.location.href;
  const platform = PLATFORMS[platformId];
  
  if (!platform || !platform.galleryPages) return false;
  
  return platform.galleryPages.some(pattern => pattern.test(url));
}

// Inject floating button injection script
function injectContentScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('content-injection.js');
  script.onload = function() {
    this.remove(); // Remove script element
    
    // Call the injectStyles function from the injection script
    window.mgContentInjection?.injectStyles();
  };
  
  (document.head || document.documentElement).appendChild(script);
}

// Enhanced Midjourney image extraction with improved DOM selectors
function extractMidjourneyImages() {
  console.log('Extracting Midjourney images from current page');
  
  try {
    // Check if we're on the Midjourney app page or user gallery page
    if (!window.location.href.includes('midjourney.com/app')) {
      console.log('Not on Midjourney app page, skipping extraction');
      return null;
    }
    
    console.log('Starting Midjourney image extraction...');
    
    // Collection to store extracted images
    const extractedImages = [];
    
    // Find all image containers on the page
    // Enhanced selectors to work with Midjourney's DOM structure
    // Look for specific elements that contain image data
    const imageContainers = [
      ...document.querySelectorAll('.card, .image-container, .grid-item, [role="img"]'),
      ...document.querySelectorAll('img[srcset*="midjourney"]'),
      ...document.querySelectorAll('div[data-job-id]'),
      ...document.querySelectorAll('figure, [role="figure"]'),
      ...document.querySelectorAll('.gallery-item, .gallery-cell, .image-wrapper, .imageContainer'),
      ...document.querySelectorAll('.jobContainer, .jobGrid, .gridItem')
    ];
    
    console.log(`Found ${imageContainers.length} potential image containers`);
    
    // Use a Set to track processed image URLs and avoid duplicates
    const processedUrls = new Set();
    
    // Process each container to extract information
    imageContainers.forEach((container, index) => {
      try {
        // Extract image URL with more robust selection
        let imageElement = container.querySelector('img, [role="img"]');
        let imageUrl = null;
        
        if (imageElement) {
          // Try multiple sources for image URL
          imageUrl = imageElement.src || 
                     imageElement.dataset?.src || 
                     imageElement.srcset?.split(' ')[0];
                     
          // Check for data attributes that might contain image URLs
          if (!imageUrl) {
            for (const key in imageElement.dataset) {
              if (key.toLowerCase().includes('src') || key.toLowerCase().includes('url')) {
                imageUrl = imageElement.dataset[key];
                break;
              }
            }
          }
        } else if (container.tagName === 'IMG') {
          // The container itself is an image
          imageUrl = container.src || container.srcset?.split(' ')[0] || container.dataset?.src;
        } else {
          // Try to find background image
          const style = window.getComputedStyle(container);
          const bgImage = style.backgroundImage;
          if (bgImage && bgImage !== 'none') {
            imageUrl = bgImage.replace(/^url\(['"](.+)['"]\)$/, '$1');
          }
        }
        
        // Skip if no valid image URL or already processed
        if (!imageUrl || processedUrls.has(imageUrl)) return;
        processedUrls.add(imageUrl);
        
        // Find the job ID - try multiple ways
        let jobId = container.dataset?.jobId || 
                    container.getAttribute('id') || 
                    container.querySelector('[data-job-id]')?.dataset?.jobId;
                    
        // Extract prompt with improved selectors
        let promptElement = container.querySelector('.prompt, .caption, [data-prompt], .description, .promptText');
        let prompt = null;
        
        if (promptElement) {
          prompt = promptElement.textContent.trim() || promptElement.dataset?.prompt;
        } else {
          // Check for title or alt text as fallback
          prompt = imageElement?.title || imageElement?.alt || container.title;
          
          // If still no prompt, check surrounding elements
          if (!prompt) {
            const parentNode = container.parentNode;
            promptElement = parentNode?.querySelector('.prompt, .caption, [data-prompt], .description, .promptText');
            if (promptElement) {
              prompt = promptElement.textContent.trim();
            }
          }
        }
        
        // Extract model information
        let modelElement = container.querySelector('.model, .modelName, [data-model]');
        let model = null;
        
        if (modelElement) {
          model = modelElement.textContent.trim() || modelElement.dataset?.model;
        }
        
        // Extract date with improved selectors
        let dateElement = container.querySelector('time, .date, .timestamp, [datetime]');
        let createdAt = null;
        
        if (dateElement) {
          createdAt = dateElement.datetime || dateElement.dateTime || dateElement.textContent.trim();
        }
        
        // Generate a unique ID
        const id = jobId || 
                  container.id || 
                  `mj-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
        
        // Ensure we have absolute URLs
        if (imageUrl && !imageUrl.startsWith('http')) {
          if (imageUrl.startsWith('//')) {
            imageUrl = 'https:' + imageUrl;
          } else if (imageUrl.startsWith('/')) {
            imageUrl = 'https://www.midjourney.com' + imageUrl;
          }
        }
        
        // Only add images with valid URLs
        if (imageUrl) {
          // Create image hash for deduplication
          const imageHash = btoa(imageUrl).substring(0, 24);
          
          extractedImages.push({
            id,
            url: imageUrl,
            prompt,
            model,
            platform: 'midjourney',
            createdAt: createdAt || new Date().toISOString(),
            sourceUrl: window.location.href,
            extractedAt: new Date().toISOString(),
            imageHash
          });
        }
      } catch (err) {
        console.error('Error extracting data from container:', err);
      }
    });
    
    console.log(`Successfully extracted ${extractedImages.length} images from Midjourney`);
    
    // Display extraction notification
    if (extractedImages.length > 0) {
      // Send message to content-injection script to show notification
      window.postMessage({
        type: 'MAIN_GALLERY_EXTRACTION',
        count: extractedImages.length
      }, '*');
      
      // Send images to background script for storage
      chrome.runtime.sendMessage({
        action: 'storeExtractedImages',
        images: extractedImages
      });
    }
    
    // Trigger UI update in popup if open
    chrome.runtime.sendMessage({
      action: 'midjourneyImagesExtracted',
      count: extractedImages.length
    });
    
    return extractedImages.length > 0;
  } catch (error) {
    console.error('Error extracting Midjourney images:', error);
    return false;
  }
}

// Simulate infinite scroll to load more content
function simulateInfiniteScroll() {
  return new Promise((resolve) => {
    const originalScrollHeight = document.body.scrollHeight;
    let scrollAttempts = 0;
    const maxScrollAttempts = 5;
    
    const scrollInterval = setInterval(() => {
      // Scroll down incrementally
      window.scrollTo(0, document.body.scrollHeight);
      
      // Check if more content has loaded
      setTimeout(() => {
        const newScrollHeight = document.body.scrollHeight;
        scrollAttempts++;
        
        if (
          newScrollHeight > originalScrollHeight || 
          scrollAttempts >= maxScrollAttempts
        ) {
          clearInterval(scrollInterval);
          console.log(`Scroll simulation completed after ${scrollAttempts} attempts`);
          resolve(newScrollHeight > originalScrollHeight);
        }
      }, 500);
    }, 1000);
  });
}

// Initialize with automatic sync for Midjourney pages
(function initialize() {
  console.log('MainGallery content script initializing');
  
  // Inject content script first
  injectContentScript();
  
  // Notify background script that content script has loaded
  chrome.runtime.sendMessage({ action: 'contentScriptLoaded' });
  
  // Auto-detect platform
  const platform = detectPlatform();
  if (platform) {
    console.log(`Detected platform: ${platform.name} (${platform.id})`);
    
    // Check if on Midjourney app user page
    if (platform.id === 'midjourney' && window.location.href.includes('midjourney.com/app/users/')) {
      console.log('On Midjourney user gallery page, setting up automatic extraction');
      
      // Initial extraction after page loads
      window.addEventListener('load', async () => {
        // Show extraction in progress notification
        const notificationEl = document.createElement('div');
        notificationEl.classList.add('main-gallery-notification');
        notificationEl.innerHTML = `
          <div class="notification-icon">
            <div class="spinner"></div>
          </div>
          <div class="notification-content">
            <h3>MainGallery</h3>
            <p>Syncing your Midjourney images...</p>
          </div>
        `;
        document.body.appendChild(notificationEl);
        
        // Wait for content to load
        setTimeout(async () => {
          await simulateInfiniteScroll();
          const result = extractMidjourneyImages();
          
          // Update notification
          if (result) {
            notificationEl.innerHTML = `
              <div class="notification-icon success">✓</div>
              <div class="notification-content">
                <h3>MainGallery</h3>
                <p>Images synced successfully!</p>
              </div>
            `;
            
            // Remove notification after a few seconds
            setTimeout(() => {
              notificationEl.classList.add('fade-out');
              setTimeout(() => notificationEl.remove(), 500);
            }, 3000);
          } else {
            notificationEl.remove();
          }
        }, 2000);
      });
      
      // Set up MutationObserver to detect new content
      const targetNode = document.querySelector('.gallery, main, #root, #app') || document.body;
      
      // Configure the observer
      const observerConfig = {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src', 'srcset', 'data-src', 'data-job-id']
      };
      
      // Create an observer instance
      const observer = new MutationObserver((mutations) => {
        // Only extract if relevant mutations found
        const shouldExtract = mutations.some(mutation => {
          // New nodes added
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            return true;
          }
          
          // Relevant attribute changes
          if (mutation.type === 'attributes') {
            const target = mutation.target;
            return (
              target.tagName === 'IMG' || 
              target.classList?.contains('gallery-item') ||
              target.hasAttribute?.('data-job-id')
            );
          }
          
          return false;
        });
        
        if (shouldExtract) {
          console.log('New Midjourney content detected, extracting images');
          setTimeout(extractMidjourneyImages, 500);
        }
      });
      
      // Start observing
      observer.observe(targetNode, observerConfig);
      console.log('MutationObserver set up to detect new Midjourney content');
    }
  }
})();

// Add styles for notifications
const style = document.createElement('style');
style.textContent = `
.main-gallery-notification {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  padding: 12px 16px;
  z-index: 9999;
  animation: slide-in 0.3s ease-out;
  max-width: 300px;
}

.main-gallery-notification.fade-out {
  animation: fade-out 0.5s ease-out forwards;
}

.notification-icon {
  width: 24px;
  height: 24px;
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-icon .spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(25, 118, 210, 0.3);
  border-top-color: rgb(25, 118, 210);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.notification-icon.success {
  color: #4caf50;
  font-weight: bold;
  font-size: 18px;
}

.notification-content h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.notification-content p {
  margin: 0;
  font-size: 13px;
  color: #666;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes fade-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
`;
document.head.appendChild(style);

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message.action);
  
  switch (message.action) {
    case 'extractMidjourneyImages':
      // Extract Midjourney images
      const result = extractMidjourneyImages();
      sendResponse({ success: !!result });
      break;
      
    case 'checkPlatformLogin':
      // Check if the user is logged into this platform
      const platform = detectPlatform();
      if (platform && platform.id === message.platformId) {
        // For Midjourney, look for signs of being logged in
        if (platform.id === 'midjourney') {
          // Check for avatar or profile elements that suggest a logged-in user
          const avatarEl = document.querySelector('.avatar, .profile-image, [alt*="profile"]');
          const usernameEl = document.querySelector('.username, .user-name, [data-username]');
          const isLoggedIn = !!avatarEl || !!usernameEl;
          sendResponse({ isLoggedIn });
        } else {
          // Default to assuming logged in if we're on the platform
          sendResponse({ isLoggedIn: true });
        }
      } else {
        sendResponse({ isLoggedIn: false });
      }
      break;
  }
  
  return true; // Keep channel open for async response
});

// Listen for window messages from injected script
window.addEventListener('message', (event) => {
  // Only accept messages from the same frame
  if (event.source !== window) return;
  
  // Check if this is our message type
  if (event.data.type === 'MAIN_GALLERY_START_EXTRACTION') {
    console.log('Manual extraction requested from UI');
    extractMidjourneyImages();
  }
});
