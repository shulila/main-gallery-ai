
console.log('MainGallery.AI content script loaded');

// Check if we're on a supported site before proceeding
function isSupportedSite() {
  // List of supported AI platforms
  const SUPPORTED_DOMAINS = [
    'midjourney.com',
    'leonardo.ai',
    'app.leonardo.ai',
    'openai.com',
    'labs.openai.com',
    'dreamstudio.ai',
    'stability.ai',
    'runway.com',
    'runwayml.com',
    'pika.art',
    'playgroundai.com',
    'creator.nightcafe.studio',
  ];

  // Check if the current domain matches any of the supported domains
  return SUPPORTED_DOMAINS.some(domain => 
    window.location.hostname.includes(domain));
}

// Inject the content script into the page
function injectScript() {
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('content-injection.js');
    script.onload = function() {
      this.remove();
      console.log('MainGallery.AI injection script loaded');
    };
    (document.head || document.documentElement).appendChild(script);
    
    // Listen for injection ready event
    window.addEventListener('MAINGALLERY_INJECTION_READY', () => {
      console.log('MainGallery.AI injection script ready');
      
      // Notify background script that content script is ready
      try {
        chrome.runtime.sendMessage({
          action: 'log',
          data: 'Content script and injection ready on ' + window.location.href
        }).catch(err => console.error('Error notifying background:', err));
      } catch (err) {
        console.error('Error sending ready message:', err);
      }
    });
  } catch (err) {
    console.error('Error injecting script:', err);
  }
}

// Delay helper function
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Auto-scroll function
async function autoScrollToBottom(scrollStep = 800, scrollDelay = 500) {
  try {
    console.log('Starting auto-scroll to bottom');
    let lastScrollTop = -1;
    let currentScrollTop = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 30; // Prevent infinite scrolling
    
    // Show scrolling toast if possible
    try {
      if (window.__MAINGALLERY__ && typeof window.__MAINGALLERY__.showScrollingToast === 'function') {
        window.__MAINGALLERY__.showScrollingToast();
      }
    } catch (e) {
      console.error('Error showing scroll toast:', e);
    }
    
    // Scroll until we reach the bottom or max attempts
    while (lastScrollTop !== currentScrollTop && scrollAttempts < maxScrollAttempts) {
      lastScrollTop = currentScrollTop;
      window.scrollBy({ top: scrollStep, behavior: 'smooth' });
      await delay(scrollDelay);
      currentScrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      scrollAttempts++;
      
      // Update progress if possible
      try {
        if (window.__MAINGALLERY__ && typeof window.__MAINGALLERY__.updateScrollingProgress === 'function') {
          window.__MAINGALLERY__.updateScrollingProgress(Math.min((scrollAttempts / maxScrollAttempts) * 100, 99));
        }
      } catch (e) {
        console.error('Error updating scroll progress:', e);
      }
    }
    
    // Complete the progress indicator
    try {
      if (window.__MAINGALLERY__ && typeof window.__MAINGALLERY__.updateScrollingProgress === 'function') {
        window.__MAINGALLERY__.updateScrollingProgress(100);
      }
    } catch (e) {
      console.error('Error completing scroll progress:', e);
    }
    
    // Scroll back to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    console.log(`Auto-scrolling complete after ${scrollAttempts} attempts.`);
    return true;
  } catch (err) {
    console.error('Error during auto-scroll:', err);
    return false;
  }
}

// Extract images from page
function extractImages() {
  return new Promise((resolve, reject) => {
    try {
      if (!window.__MAINGALLERY__) {
        console.error('Main Gallery extraction utilities not available');
        resolve({ images: extractImagesFromPage(), success: true });
        return;
      }
      
      const result = window.__MAINGALLERY__.extractAIImages();
      resolve({ 
        images: result.images || [], 
        success: result.images && result.images.length > 0 
      });
    } catch (err) {
      console.error('Error extracting images:', err);
      // Fallback to direct DOM extraction
      resolve({ images: extractImagesFromPage(), success: true });
    }
  });
}

// Extract images directly from DOM as fallback
function extractImagesFromPage() {
  console.log('Using fallback image extraction method');
  const images = [];
  const extractedUrls = new Set();

  // Get all image elements
  const imgElements = document.querySelectorAll('img');
  
  imgElements.forEach((img) => {
    const src = img.src;
    
    // Skip if already extracted, no src, too small, or data URL
    if (extractedUrls.has(src) || !src || src.startsWith('data:') || 
        (img.width < 200 && img.height < 200)) {
      return;
    }
    
    // Determine platform from hostname
    let platform = 'unknown';
    if (window.location.hostname.includes('midjourney')) {
      platform = 'midjourney';
    } else if (window.location.hostname.includes('leonardo')) {
      platform = 'leonardo';
    } else if (window.location.hostname.includes('openai')) {
      platform = 'dalle';
    } else if (window.location.hostname.includes('pika')) {
      platform = 'pika';
    } else if (window.location.hostname.includes('runway')) {
      platform = 'runway';
    }
    
    // Get prompt from alt text or nearby elements
    let prompt = img.alt || img.title || '';
    if (!prompt && img.parentElement) {
      const promptElement = img.parentElement.querySelector('.prompt, [data-prompt], .caption, .description');
      if (promptElement) {
        prompt = promptElement.textContent || '';
      }
    }
    
    // Create image object
    images.push({
      id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: src,
      prompt: prompt.trim(),
      platform: platform,
      sourceURL: window.location.href,
      timestamp: Date.now(),
      type: 'image'
    });
    
    extractedUrls.add(src);
  });

  console.log(`Extracted ${images.length} images using fallback method`);
  return images;
}

// Show toast notifications
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.zIndex = '999999';
  toast.style.padding = '10px 16px';
  toast.style.borderRadius = '4px';
  toast.style.fontSize = '14px';
  toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
  
  // Set colors based on type
  if (type === 'error') {
    toast.style.background = '#f44336';
    toast.style.color = 'white';
  } else if (type === 'success') {
    toast.style.background = '#4caf50';
    toast.style.color = 'white';
  } else {
    toast.style.background = '#2196f3';
    toast.style.color = 'white';
  }
  
  document.body.appendChild(toast);
  
  // Animate in
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(20px)';
  toast.style.transition = 'opacity 0.3s, transform 0.3s';
  
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }, 10);
  
  // Remove after delay
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    
    setTimeout(() => toast.remove(), 300);
  }, 4000);
  
  return toast;
}

// Check if we're on a supported site and inject script
if (isSupportedSite()) {
  console.log('MainGallery.AI running on supported site');
  injectScript();
} else {
  console.log('MainGallery.AI not running on unsupported site');
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  try {
    if (request.action === 'extractImages') {
      if (!isSupportedSite()) {
        sendResponse({ images: [], success: false, reason: 'unsupported_site' });
        return true;
      }
      
      extractImages()
        .then(result => {
          sendResponse(result);
        })
        .catch(err => {
          console.error('Error in extractImages:', err);
          sendResponse({ images: [], success: false, error: err.message });
        });
      
      return true; // Indicates async response
    } 
    else if (request.action === 'startAutoScan') {
      console.log('Starting auto-scanning with scrolling');
      
      // Immediately send response that scan started (important to avoid connection errors)
      sendResponse({ success: true, status: 'scan_started' });
      
      if (!isSupportedSite()) {
        console.log('Not a supported site, not scanning');
        showToast('This site is not supported for image scanning', 'error');
        
        // Notify background about the unsupported site
        try {
          chrome.runtime.sendMessage({
            action: 'scanComplete',
            success: false,
            reason: 'unsupported_site',
            images: []
          });
        } catch (err) {
          console.error('Error sending unsupported site message:', err);
        }
        
        return true;
      }
      
      // Start the auto-scan process
      try {
        // Display start toast
        showToast('Starting image scan, please wait...', 'info');
        
        // Auto-scroll to the bottom of the page
        await autoScrollToBottom(800, 500);
        console.log('Auto-scroll complete, extracting images');
        
        // After scrolling, extract all images
        const result = await extractImages();
        const images = result.images || [];
        console.log(`Found ${images.length} images after scrolling`);
        
        // Show success toast
        if (images.length > 0) {
          showToast(`Found ${images.length} images, sending to gallery`, 'success');
        } else {
          showToast('No images found on this page', 'info');
        }
        
        // Send the results back to background script
        chrome.runtime.sendMessage({
          action: 'scanComplete',
          images: images,
          success: images.length > 0
        }).catch(err => {
          console.error('Error sending scan results to background:', err);
          showToast('Error syncing images to gallery', 'error');
        });
      } catch (err) {
        console.error('Error in auto-scanning process:', err);
        showToast('Error scanning images', 'error');
        
        // Notify background script about failure
        try {
          chrome.runtime.sendMessage({
            action: 'scanComplete',
            images: [],
            success: false,
            error: err.message
          }).catch(e => console.error('Error sending scan error to background:', e));
        } catch (e) {
          console.error('Failed to send error to background:', e);
        }
      }
      
      return true; // We already sent the response
    }
    else if (request.action === 'showUnsupportedTabToast') {
      const message = request.message || "Please switch to a supported AI platform (Midjourney, DALL·E, etc) to use MainGallery.AI";
      showToast(message, 'error');
      sendResponse({ success: true });
      return false;
    }
  } catch (err) {
    console.error('Error handling message in content script:', err);
    sendResponse({ success: false, error: err.message });
  }
  
  return true; // Keep channel open for async response
});
