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

// Enhanced Midjourney image extraction with improved DOM selectors and detailed logging
function extractMidjourneyImages() {
  console.log('⚙️ Extracting Midjourney images from current page:', window.location.href);
  
  try {
    // Check if we're on the Midjourney app page or user gallery page
    if (!window.location.href.includes('midjourney.com/app')) {
      console.log('Not on Midjourney app page, skipping extraction');
      return null;
    }
    
    console.log('✅ URL confirmed as Midjourney, starting image extraction...');
    
    // Collection to store extracted images
    const extractedImages = [];
    
    // Find all image containers on the page
    // Enhanced selectors to work with Midjourney's DOM structure
    console.log('🔍 Searching for image containers...');
    const imageContainers = [
      ...document.querySelectorAll('.card, .image-container, .grid-item, [role="img"]'),
      ...document.querySelectorAll('img[srcset*="midjourney"]'),
      ...document.querySelectorAll('div[data-job-id]'),
      ...document.querySelectorAll('figure, [role="figure"]'),
      ...document.querySelectorAll('.gallery-item, .gallery-cell, .image-wrapper, .imageContainer'),
      ...document.querySelectorAll('.jobContainer, .jobGrid, .gridItem')
    ];
    
    console.log(`📊 Found ${imageContainers.length} potential image containers`);
    
    // Use a Set to track processed image URLs and avoid duplicates
    const processedUrls = new Set();
    
    // Process each container to extract information
    console.log('🔄 Processing image containers...');
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
        if (!imageUrl || processedUrls.has(imageUrl)) {
          if (!imageUrl) {
            console.log(`⚠️ Container #${index} - No image URL found`);
          } else {
            console.log(`⚠️ Container #${index} - Duplicate URL: ${imageUrl.substring(0, 50)}...`);
          }
          return;
        }
        
        processedUrls.add(imageUrl);
        console.log(`✅ Container #${index} - Found image: ${imageUrl.substring(0, 50)}...`);
        
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
        
        if (prompt) {
          console.log(`📝 Container #${index} - Found prompt: ${prompt.substring(0, 50)}...`);
        } else {
          console.log(`⚠️ Container #${index} - No prompt found`);
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
            platform: 'Midjourney',
            platformName: 'Midjourney',
            createdAt: createdAt || new Date().toISOString(),
            creationDate: createdAt || new Date().toISOString(),
            sourceUrl: window.location.href,
            tabUrl: window.location.href,
            extractedAt: new Date().toISOString(),
            timestamp: Date.now(),
            type: 'image',
            imageHash
          });
        }
      } catch (err) {
        console.error('Error extracting data from container:', err);
      }
    });
    
    console.log(`✅ Successfully extracted ${extractedImages.length} images from Midjourney`);
    console.log('📊 Sample image data:', extractedImages.length > 0 ? extractedImages[0] : 'No images found');
    
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
    
    return extractedImages;
  } catch (error) {
    console.error('❌ Error extracting Midjourney images:', error);
    return [];
  }
}

// Extract Leonardo.ai images with metadata
function extractLeonardoImages() {
  console.log('Extracting Leonardo.ai images');
  
  try {
    // Check if we're on a Leonardo.ai page
    if (!window.location.href.includes('leonardo.ai')) {
      console.log('Not on Leonardo.ai, skipping extraction');
      return null;
    }
    
    console.log('Starting Leonardo.ai image extraction...');
    
    // Collection to store extracted images
    const extractedImages = [];
    
    // Find all image containers
    const imageContainers = [
      ...document.querySelectorAll('.generation-item, .image-item, .image-card'),
      ...document.querySelectorAll('[data-testid="image-container"]'),
      ...document.querySelectorAll('.react-photo-album--photo'),
      ...document.querySelectorAll('.asset-card')
    ];
    
    console.log(`Found ${imageContainers.length} potential Leonardo images`);
    
    // Track processed URLs to avoid duplicates
    const processedUrls = new Set();
    
    // Process each container
    imageContainers.forEach(container => {
      try {
        // Find image element
        const imageElement = container.querySelector('img') || container;
        let imageUrl = null;
        
        // Get image URL
        if (imageElement.tagName === 'IMG') {
          imageUrl = imageElement.src;
        } else {
          // Try background image
          const style = window.getComputedStyle(imageElement);
          const bgImage = style.backgroundImage;
          if (bgImage && bgImage !== 'none') {
            imageUrl = bgImage.replace(/^url\(['"](.+)['"]\)$/, '$1');
          }
        }
        
        // Skip if no URL or already processed
        if (!imageUrl || processedUrls.has(imageUrl)) return;
        processedUrls.add(imageUrl);
        
        // Extract prompt
        let promptElement = container.querySelector('.prompt-text, .description, [data-testid="prompt-text"]');
        let prompt = null;
        
        if (promptElement) {
          prompt = promptElement.textContent.trim();
        } else {
          // Try nearby elements
          prompt = imageElement.alt || imageElement.title;
        }
        
        // Extract model
        let modelElement = container.querySelector('.model-name, [data-testid="model-name"]');
        let model = modelElement?.textContent.trim() || 'Leonardo';
        
        // Extract date
        let dateElement = container.querySelector('time, .timestamp, .date');
        let createdAt = dateElement?.textContent.trim() || new Date().toISOString();
        
        // Generate ID
        const id = `leonardo-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
        
        extractedImages.push({
          id,
          url: imageUrl,
          prompt,
          model,
          platform: 'leonardo',
          createdAt,
          sourceUrl: window.location.href,
          extractedAt: new Date().toISOString(),
          imageHash: btoa(imageUrl).substring(0, 24)
        });
      } catch (err) {
        console.error('Error extracting Leonardo image:', err);
      }
    });
    
    console.log(`Successfully extracted ${extractedImages.length} images from Leonardo.ai`);
    
    if (extractedImages.length > 0) {
      // Send images to background script
      chrome.runtime.sendMessage({
        action: 'storeExtractedImages',
        images: extractedImages
      });
    }
    
    return extractedImages.length > 0;
  } catch (error) {
    console.error('Error extracting Leonardo images:', error);
    return false;
  }
}

// Extract Runway images with metadata
function extractRunwayImages() {
  console.log('Extracting Runway images');
  
  try {
    // Check if we're on a Runway page
    if (!window.location.href.includes('runwayml.com')) {
      console.log('Not on Runway, skipping extraction');
      return null;
    }
    
    console.log('Starting Runway image extraction...');
    
    // Collection to store extracted images
    const extractedImages = [];
    
    // Find all image/video items
    const mediaContainers = [
      ...document.querySelectorAll('.media-card, .project-item, .generation-item'),
      ...document.querySelectorAll('.asset-card, .asset-tile'),
      ...document.querySelectorAll('.video-asset, .image-asset')
    ];
    
    console.log(`Found ${mediaContainers.length} potential Runway media items`);
    
    // Track processed URLs
    const processedUrls = new Set();
    
    // Process each container
    mediaContainers.forEach(container => {
      try {
        // Find image/video element
        const imageElement = container.querySelector('img') || container.querySelector('video');
        let mediaUrl = null;
        
        if (imageElement) {
          if (imageElement.tagName === 'IMG') {
            mediaUrl = imageElement.src;
          } else if (imageElement.tagName === 'VIDEO') {
            // Get poster or first frame as image
            mediaUrl = imageElement.poster || imageElement.src;
          }
        } else {
          // Try background image
          const style = window.getComputedStyle(container);
          const bgImage = style.backgroundImage;
          if (bgImage && bgImage !== 'none') {
            mediaUrl = bgImage.replace(/^url\(['"](.+)['"]\)$/, '$1');
          }
        }
        
        // Skip if no URL or already processed
        if (!mediaUrl || processedUrls.has(mediaUrl)) return;
        processedUrls.add(mediaUrl);
        
        // Extract prompt
        let promptElement = container.querySelector('.prompt, .caption, .description');
        let prompt = null;
        
        if (promptElement) {
          prompt = promptElement.textContent.trim();
        } else {
          prompt = imageElement?.alt || container.title;
        }
        
        // Extract model/tool info
        let modelElement = container.querySelector('.model, .tool-name');
        let model = modelElement?.textContent.trim() || 'Runway';
        
        // Generate ID
        const id = `runway-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
        
        extractedImages.push({
          id,
          url: mediaUrl,
          prompt,
          model,
          platform: 'runway',
          createdAt: new Date().toISOString(),
          sourceUrl: window.location.href,
          extractedAt: new Date().toISOString(),
          imageHash: btoa(mediaUrl).substring(0, 24),
          isVideo: imageElement?.tagName === 'VIDEO'
        });
      } catch (err) {
        console.error('Error extracting Runway media:', err);
      }
    });
    
    console.log(`Successfully extracted ${extractedImages.length} media items from Runway`);
    
    if (extractedImages.length > 0) {
      // Send images to background script
      chrome.runtime.sendMessage({
        action: 'storeExtractedImages',
        images: extractedImages
      });
    }
    
    return extractedImages.length > 0;
  } catch (error) {
    console.error('Error extracting Runway media:', error);
    return false;
  }
}

// Extract all images from the current page
function extractAllImages() {
  console.log('Extracting all images from the current page');
  
  try {
    // Find all image elements on the page
    const imageElements = document.querySelectorAll('img');
    console.log(`Found ${imageElements.length} image elements`);
    
    // Extract relevant information from each image
    const extractedImages = Array.from(imageElements)
      .map(img => {
        // Only process images with src and size > 0 (and not data URLs which are often icons)
        if (!img.src || img.src.startsWith('data:') || img.width < 20 || img.height < 20) {
          return null;
        }
        
        // Get image metadata
        const rect = img.getBoundingClientRect();
        
        return {
          src: img.src,
          alt: img.alt || '',
          title: img.title || '',
          width: img.width,
          height: img.height,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          visible: rect.top < window.innerHeight && rect.bottom > 0,
          domain: window.location.hostname,
          path: window.location.pathname,
          pageTitle: document.title
        };
      })
      .filter(Boolean); // Remove nulls
    
    console.log(`Extracted ${extractedImages.length} valid images`);
    return extractedImages;
  } catch (error) {
    console.error('Error extracting images:', error);
    return [];
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
    if (platform.id === 'midjourney' && window.location.href.includes('midjourney.com/app/')) {
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
          if (result && result.length > 0) {
            notificationEl.innerHTML = `
              <div class="notification-icon success">✓</div>
              <div class="notification-content">
                <h3>MainGallery</h3>
                <p>Found ${result.length} images!</p>
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
      sendResponse({ success: !!result, images: result });
      break;
      
    case 'extractLeonardoImages':
      // Extract Leonardo.ai images
      const leonardoResult = extractLeonardoImages();
      sendResponse({ success: !!leonardoResult });
      break;
      
    case 'extractRunwayImages':
      // Extract Runway images
      const runwayResult = extractRunwayImages();
      sendResponse({ success: !!runwayResult });
      break;
      
    case 'extractPlatformImages':
      // Auto-detect platform and extract images
      const platform = detectPlatform();
      if (!platform) {
        sendResponse({ success: false, error: 'Platform not detected' });
        return;
      }
      
      // Based on platform ID, call appropriate extraction function
      let platformResult = false;
      if (platform.id === 'midjourney') {
        platformResult = extractMidjourneyImages();
      } else if (platform.id === 'leonardo') {
        platformResult = extractLeonardoImages();
      } else if (platform.id === 'runway') {
        platformResult = extractRunwayImages();
      }
      
      sendResponse({ 
        success: !!platformResult, 
        platform: platform.name,
        count: platformResult ? platformResult.length : 0,
        images: platformResult
      });
      break;
      
    case 'checkPlatformLogin':
      // Check if the user is logged into this platform
      const detectedPlatform = detectPlatform();
      if (detectedPlatform && detectedPlatform.id === message.platformId) {
        // For Midjourney, look for signs of being logged in
        if (detectedPlatform.id === 'midjourney') {
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
      
    case 'extractImages':
      // Extract all images from the page
      const extractedImages = extractAllImages();
      sendResponse({ images: extractedImages });
      break;
      
    case 'simulateInfiniteScroll':
      // Simulate infinite scroll and then extract images
      simulateInfiniteScroll().then(scrolled => {
        const images = extractAllImages();
        sendResponse({ scrolled, images });
      });
      return true; // Keep channel open for async response
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
