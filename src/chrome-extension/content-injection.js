
// This script is injected into the page to extract images
// It runs in the page context to access DOM elements directly

console.log('MainGallery.AI Content Injection Script Started');

/**
 * Extract AI images from the current page
 * @returns {Object} Object containing extracted images
 */
function extractAIImages() {
  console.log('Extracting AI images from page...');
  
  // Container for extracted images
  const images = [];
  const extractedUrls = new Set();
  
  // Extract platform name from URL or document title
  const platformHint = document.title.toLowerCase();
  let platform = 'unknown';
  
  if (window.location.hostname.includes('midjourney')) {
    platform = 'midjourney';
  } else if (window.location.hostname.includes('leonardo') || 
            window.location.hostname.includes('dreamstudio') || 
            platformHint.includes('leonardo')) {
    platform = 'leonardo';
  } else if (window.location.hostname.includes('openai') || 
            window.location.hostname.includes('dall-e') || 
            platformHint.includes('dall-e')) {
    platform = 'dalle';
  } else if (window.location.hostname.includes('stability') || 
            platformHint.includes('stability')) {
    platform = 'stability';
  } else if (window.location.hostname.includes('pika') || 
            platformHint.includes('pika')) {
    platform = 'pika';
  } else if (window.location.hostname.includes('runway') || 
            platformHint.includes('runway')) {
    platform = 'runway';
  }
  
  // Select all image elements in the page
  const imgElements = document.querySelectorAll('img[src]:not([src=""])');
  
  imgElements.forEach(img => {
    const src = img.getAttribute('src') || '';
    
    // Skip if already extracted or too small (likely icons)
    if (extractedUrls.has(src) || !src || src.startsWith('data:') || 
        (img.width < 200 && img.height < 200)) {
      return;
    }
    
    // Extract image data
    const alt = img.getAttribute('alt') || '';
    const title = img.getAttribute('title') || '';
    const parentNode = img.parentElement;
    let prompt = alt || title || '';
    
    // Try to find prompt in parent elements (common in gallery sites)
    if (!prompt && parentNode) {
      const promptElement = parentNode.querySelector('.prompt, [data-prompt], .caption, .description');
      if (promptElement) {
        prompt = promptElement.textContent || '';
      }
    }
    
    // Add to results and mark as processed
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
  
  console.log(`Found ${images.length} images on page (${extractedUrls.size} unique).`);
  
  return { images };
}

/**
 * Extract AI images with auto-scrolling to capture lazy-loaded content
 * @param {Object} options Scrolling options (scrollDelay, scrollStep, maxScrolls)
 * @returns {Promise<Object>} Promise that resolves with extracted images
 */
function extractAIImagesWithScroll(options = {}) {
  const scrollDelay = options.scrollDelay || 500;
  const scrollStep = options.scrollStep || 800;
  const maxScrollAttempts = options.maxScrolls || 30;
  
  return new Promise((resolve) => {
    console.log('Starting auto-scroll image extraction');
    
    // Container for extracted images
    const images = [];
    const extractedUrls = new Set();
    
    // Extract platform name from URL or document title
    const platformHint = document.title.toLowerCase();
    let platform = 'unknown';
    
    if (window.location.hostname.includes('midjourney')) {
      platform = 'midjourney';
    } else if (window.location.hostname.includes('leonardo') || 
              window.location.hostname.includes('dreamstudio') || 
              platformHint.includes('leonardo')) {
      platform = 'leonardo';
    } else if (window.location.hostname.includes('openai') || 
              window.location.hostname.includes('dall-e') || 
              platformHint.includes('dall-e')) {
      platform = 'dalle';
    } else if (window.location.hostname.includes('stability') || 
              platformHint.includes('stability')) {
      platform = 'stability';
    } else if (window.location.hostname.includes('pika') || 
              platformHint.includes('pika')) {
      platform = 'pika';
    } else if (window.location.hostname.includes('runway') || 
              platformHint.includes('runway')) {
      platform = 'runway';
    }
    
    // Function to extract images from the current view
    const extractCurrentImages = () => {
      // Select all image elements in the page
      const imgElements = document.querySelectorAll('img[src]:not([src=""])');
      
      imgElements.forEach(img => {
        const src = img.getAttribute('src') || '';
        
        // Skip if already extracted or too small (likely icons)
        if (extractedUrls.has(src) || !src || src.startsWith('data:') || 
            (img.width < 200 && img.height < 200)) {
          return;
        }
        
        // Extract image data
        const alt = img.getAttribute('alt') || '';
        const title = img.getAttribute('title') || '';
        const parentNode = img.parentElement;
        let prompt = alt || title || '';
        
        // Try to find prompt in parent elements (common in gallery sites)
        if (!prompt && parentNode) {
          const promptElement = parentNode.querySelector('.prompt, [data-prompt], .caption, .description');
          if (promptElement) {
            prompt = promptElement.textContent || '';
          }
        }
        
        // Add to results and mark as processed
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
      
      console.log(`Found ${images.length} images so far (${extractedUrls.size} unique).`);
    };
    
    // Create a toast notification element
    const createScanningToast = () => {
      // Create toast container if it doesn't exist
      let toastContainer = document.getElementById('maingallery-toast-container');
      
      if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'maingallery-toast-container';
        toastContainer.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-width: 320px;
          width: 100%;
          pointer-events: none;
        `;
        document.body.appendChild(toastContainer);
      }
      
      // Create the toast element
      const toast = document.createElement('div');
      toast.id = 'maingallery-scanning-toast';
      
      // Set toast styling
      toast.style.cssText = `
        background-color: rgba(59, 130, 246, 0.9);
        color: white;
        border-left: 4px solid rgb(59, 130, 246);
        padding: 12px 16px;
        border-radius: 4px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
        opacity: 1;
        pointer-events: auto;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      `;
      
      // Set inner HTML with icon and message
      toast.innerHTML = `
        <div class="maingallery-toast-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        </div>
        <div class="maingallery-toast-message" style="flex: 1;">
          <div style="font-weight: 500; margin-bottom: 2px;">MainGallery.AI</div>
          <div style="font-size: 14px;">
            Scanning page for AI images...
            <div class="maingallery-toast-progress" style="width: 100%; height: 4px; margin-top: 6px; background-color: rgba(255,255,255,0.2); border-radius: 2px;">
              <div class="maingallery-toast-progress-bar" style="width: 0%; height: 100%; background-color: white; border-radius: 2px; transition: width 0.3s;"></div>
            </div>
          </div>
        </div>
      `;
      
      // Add to container
      toastContainer.appendChild(toast);
      
      return toast;
    };
    
    // Update progress bar in toast
    const updateScanningProgress = (progress) => {
      const toast = document.getElementById('maingallery-scanning-toast');
      if (!toast) return;
      
      const progressBar = toast.querySelector('.maingallery-toast-progress-bar');
      if (progressBar) {
        progressBar.style.width = `${progress}%`;
      }
    };
    
    // Remove toast element
    const removeScanningToast = () => {
      const toast = document.getElementById('maingallery-scanning-toast');
      if (!toast) return;
      
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-20px)';
      
      setTimeout(() => {
        // Remove the toast
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
        
        // Check if container is empty and can be removed
        const container = document.getElementById('maingallery-toast-container');
        if (container && container.children.length === 0) {
          document.body.removeChild(container);
        }
      }, 300);
    };
    
    // Create scanning toast
    const scanningToast = createScanningToast();
    
    // Get initial images before scrolling
    extractCurrentImages();
    
    let scrollAttempts = 0;
    let previousHeight = 0;
    
    // Start scrolling process
    const scrollAndExtract = () => {
      // Update progress
      const progress = Math.min((scrollAttempts / maxScrollAttempts) * 100, 99);
      updateScanningProgress(progress);
      
      // Get current scroll position and document height
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
      
      // Check if we've reached bottom or made too many attempts
      if (scrollTop + window.innerHeight >= scrollHeight - 200 || 
          scrollAttempts >= maxScrollAttempts ||
          (scrollHeight === previousHeight && scrollAttempts > 5)) {
        
        // Final extraction to make sure we got everything
        extractCurrentImages();
        
        // Update progress to 100%
        updateScanningProgress(100);
        
        // Remove toast after delay
        setTimeout(() => {
          removeScanningToast();
          
          // Create success toast
          const successToast = document.createElement('div');
          successToast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            background-color: rgba(34, 197, 94, 0.9);
            color: white;
            padding: 12px 16px;
            border-radius: 4px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            display: flex;
            align-items: center;
            gap: 8px;
            max-width: 320px;
            border-left: 4px solid rgb(34, 197, 94);
          `;
          
          successToast.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <div>
              <div style="font-weight: 500; margin-bottom: 2px;">MainGallery.AI</div>
              <div style="font-size: 14px;">Scan complete: Found ${images.length} images</div>
            </div>
          `;
          
          document.body.appendChild(successToast);
          
          // Remove success toast after 3 seconds
          setTimeout(() => {
            if (document.body.contains(successToast)) {
              document.body.removeChild(successToast);
            }
          }, 3000);
        }, 500);
        
        console.log(`Scrolling complete. Found ${images.length} images total.`);
        resolve({ images });
        return;
      }
      
      // Scroll down
      window.scrollBy({
        top: scrollStep,
        behavior: 'smooth'
      });
      
      // Update counters
      scrollAttempts++;
      previousHeight = scrollHeight;
      
      // Wait and then extract new images that may have loaded
      setTimeout(() => {
        extractCurrentImages();
        
        // Continue scrolling
        setTimeout(scrollAndExtract, scrollDelay);
      }, scrollDelay);
    };
    
    // Start the scrolling process
    setTimeout(scrollAndExtract, scrollDelay);
  });
}

// Show unsupported site toast
function showUnsupportedSiteToast(message) {
  // Create toast container
  let toastContainer = document.getElementById('maingallery-toast-container');
  
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'maingallery-toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 320px;
      width: 100%;
    `;
    document.body.appendChild(toastContainer);
  }
  
  // Create the toast element
  const toast = document.createElement('div');
  
  // Set toast styling
  toast.style.cssText = `
    background-color: rgba(245, 158, 11, 0.9);
    color: white;
    border-left: 4px solid rgb(245, 158, 11);
    padding: 12px 16px;
    border-radius: 4px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    opacity: 0;
    transform: translateY(-20px);
    transition: opacity 0.3s, transform 0.3s;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  `;
  
  // Set inner HTML with icon and message
  toast.innerHTML = `
    <div>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
      </svg>
    </div>
    <div style="flex: 1;">
      <div style="font-weight: 500; margin-bottom: 2px;">MainGallery.AI</div>
      <div style="font-size: 14px;">${message || "Please switch to a supported AI platform (Midjourney, DALL·E, etc) to use MainGallery.AI"}</div>
    </div>
    <div class="maingallery-toast-close" style="cursor: pointer; color: white; opacity: 0.7;">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    </div>
  `;
  
  // Add to container
  toastContainer.appendChild(toast);
  
  // Add event listener to close button
  const closeBtn = toast.querySelector('.maingallery-toast-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-20px)';
      
      setTimeout(() => {
        // Remove the toast
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
        
        // Check if container is empty and can be removed
        if (toastContainer && toastContainer.children.length === 0) {
          document.body.removeChild(toastContainer);
        }
      }, 300); // Corresponds to the transition duration
    });
  }
  
  // Trigger animation
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }, 10);
  
  // Auto hide after duration
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    
    setTimeout(() => {
      // Remove the toast
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      
      // Check if container is empty and can be removed
      if (toastContainer && toastContainer.children.length === 0) {
        document.body.removeChild(toastContainer);
      }
    }, 300); 
  }, 5000);
  
  return toast;
}

// Expose functions to page context
window.__MAINGALLERY__ = {
  extractAIImages,
  extractAIImagesWithScroll,
  showUnsupportedSiteToast
};

// Signal that content injection script is ready
window.dispatchEvent(new CustomEvent('MAINGALLERY_INJECTION_READY'));
