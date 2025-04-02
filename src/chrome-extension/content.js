
console.log('MainGallery.AI content script loaded');

// Check if we're on a supported site before proceeding
function isSupportedSite() {
  // List of supported AI platforms
  const SUPPORTED_DOMAINS = [
    'midjourney.com',
    'www.midjourney.com',
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
    'discord.com'
  ];

  // Check if the current domain matches any of the supported domains
  return SUPPORTED_DOMAINS.some(domain => 
    window.location.hostname.includes(domain));
}

// Message the background script when content script loads
function notifyBackgroundScriptReady() {
  try {
    chrome.runtime.sendMessage({ 
      action: 'CONTENT_SCRIPT_READY',
      location: window.location.href
    });
  } catch (err) {
    console.error('Error notifying background script:', err);
  }
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
      notifyBackgroundScriptReady();
    });
  } catch (err) {
    console.error('Error injecting script:', err);
  }
}

// Delay helper function
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Auto-scroll function - improved to ensure complete scrolling
async function autoScrollToBottom(scrollStep = 800, scrollDelay = 500) {
  try {
    console.log('Starting auto-scroll to bottom');
    
    // Show scrolling toast
    showToast('Scanning page for AI images...', 'info');
    
    let lastScrollTop = -1;
    let currentScrollTop = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 50; // Increase max attempts to ensure we get everything
    
    // Scroll until we reach the bottom or max attempts
    while (lastScrollTop !== currentScrollTop && scrollAttempts < maxScrollAttempts) {
      lastScrollTop = currentScrollTop;
      window.scrollBy({ top: scrollStep, behavior: 'smooth' });
      await delay(scrollDelay);
      currentScrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      scrollAttempts++;
      
      console.log(`Scroll attempt ${scrollAttempts}/${maxScrollAttempts}, position: ${currentScrollTop}`);
      
      // Wait longer every 10 scrolls to allow images to load
      if (scrollAttempts % 10 === 0) {
        console.log('Extended wait to allow images to load');
        await delay(1500); // Longer delay every 10 scrolls
      }
    }
    
    // Scroll back to top
    console.log('Scrolling back to top');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await delay(500);
    
    console.log(`Auto-scrolling complete after ${scrollAttempts} attempts.`);
    showToast('Scan complete, extracting images...', 'success');
    return true;
  } catch (err) {
    console.error('Error during auto-scroll:', err);
    showToast('Error while scanning page', 'error');
    return false;
  }
}

// Set up mutation observer to detect dynamically loaded images
let mutationObserver = null;
function setupMutationObserver() {
  if (mutationObserver) {
    mutationObserver.disconnect();
  }
  
  console.log('Setting up mutation observer for dynamically loaded content');
  mutationObserver = new MutationObserver((mutations) => {
    const hasNewImages = mutations.some(mutation => {
      return Array.from(mutation.addedNodes).some(node => {
        if (node.nodeName === 'IMG') return true;
        if (node.querySelectorAll) {
          return node.querySelectorAll('img').length > 0;
        }
        return false;
      });
    });
    
    if (hasNewImages) {
      console.log('Mutation observer detected new images loaded');
    }
  });
  
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false
  });
}

// Extract images from page
function extractImages() {
  try {
    console.log('Starting image extraction...');
    
    // Try to use the injection method first if available
    if (window.__MAINGALLERY__ && typeof window.__MAINGALLERY__.extractAIImages === 'function') {
      console.log('Using injection script to extract images');
      const result = window.__MAINGALLERY__.extractAIImages();
      console.log('Used injection script to extract images:', result.images?.length || 0);
      return { 
        images: result.images || [], 
        success: result.images && result.images.length > 0 
      };
    }
    
    // Fallback to direct DOM extraction
    console.log('Falling back to direct DOM extraction method');
    const extractedImages = extractImagesFromPage();
    console.log(`Direct DOM extraction found ${extractedImages.length} images`);
    
    return { 
      images: extractedImages, 
      success: true 
    };
  } catch (err) {
    console.error('Error extracting images:', err);
    // Fallback to direct DOM extraction
    const extractedImages = extractImagesFromPage();
    console.log(`Fallback extraction found ${extractedImages.length} images after error`);
    return { 
      images: extractedImages, 
      success: true 
    };
  }
}

// Extract images directly from DOM with improved Midjourney support
function extractImagesFromPage() {
  console.log('Using direct DOM extraction method');
  const images = [];
  const extractedUrls = new Set();
  let processedCount = 0;
  let skippedCount = 0;
  let smallImageCount = 0;
  let dataUrlCount = 0;

  // Get all image elements
  const imgElements = document.querySelectorAll('img');
  console.log(`Found ${imgElements.length} total img elements on page`);
  
  // Special handling for Midjourney
  const isMidjourney = window.location.hostname.includes('midjourney');
  let midjourneyGridImages = [];
  
  if (isMidjourney) {
    console.log('Detected Midjourney site, using specialized selectors');
    
    // Latest Midjourney-specific selectors (2025 April update)
    // These selectors target the specific containers and image elements in Midjourney's UI
    const midjourneySelectors = [
      // Most specific selectors for generated images
      'img[src*="/generated/"]',
      'img[src*="cdn.midjourney.com"]',
      'img[src*="discord.com/channels"][src*="midjourney"]',
      
      // Common MJ grid layouts
      '.grid-card img', 
      '.imageContainer img', 
      '.image-grid-content img',
      '.showcase-grid img',
      '.gallery img',
      '[data-grid="true"] img',
      '.gridItemContainer img',
      
      // Feed item layouts
      '.feed-item img',
      '.card-img-top',
      '.mj-image',
      '.mj-result',
      
      // Job result containers
      '.job-card img',
      '.job-grid img',
      '.result-image img',
      '.result img',
      
      // New layouts (2025)
      '.midjourney-image-container img',
      '.midjourney-gallery-item img',
      '.image-result-container img',
      '.showcase-image img',
      '.mjgrid-item img',
      '[data-testid="image-result"] img'
    ];
    
    // Try each selector
    midjourneySelectors.forEach(selector => {
      try {
        const found = document.querySelectorAll(selector);
        if (found && found.length > 0) {
          console.log(`Found ${found.length} images using selector: ${selector}`);
          midjourneyGridImages = [...midjourneyGridImages, ...Array.from(found)];
        }
      } catch (err) {
        console.error(`Error querying selector ${selector}:`, err);
      }
    });
    
    // Log specialized findings
    console.log(`Found ${midjourneyGridImages.length} Midjourney grid images with specialized selectors`);
    
    // If specialized selectors didn't work, log it but continue with regular extraction
    if (midjourneyGridImages.length === 0) {
      console.warn('No Midjourney grid images found with specialized selectors, falling back to generic detection');
      
      // When specialized selectors fail, try a broader approach to find images
      // For very recently changed Midjourney layouts, these may catch images
      try {
        const allImagesWithSrc = document.querySelectorAll('img[src]:not([src^="data:"])');
        console.log(`Found ${allImagesWithSrc.length} total images with src attributes`);
        
        // Filter for likely Midjourney images based on common URL patterns
        const likelyMjImages = Array.from(allImagesWithSrc).filter(img => {
          const src = img.src.toLowerCase();
          const isLargeEnough = (img.width > 200 || img.height > 200);
          const hasGoodSource = (
            src.includes('cdn') || 
            src.includes('storage') || 
            src.includes('media') ||
            src.includes('image') ||
            src.includes('assets')
          );
          return isLargeEnough && hasGoodSource;
        });
        
        console.log(`Found ${likelyMjImages.length} likely Midjourney images by URL pattern`);
        midjourneyGridImages = [...midjourneyGridImages, ...likelyMjImages];
      } catch (err) {
        console.error('Error in fallback Midjourney image detection:', err);
      }
    }
  }
  
  // Combine specialized and regular images
  const allImages = isMidjourney && midjourneyGridImages.length > 0 ? 
    midjourneyGridImages : imgElements;
  
  console.log(`Processing ${allImages.length} images (${isMidjourney ? 'Midjourney specialized' : 'standard'} selection)`);
  
  // Debug: log some sample images for troubleshooting
  if (allImages.length > 0) {
    console.log('Sample image details:');
    const sampleSize = Math.min(3, allImages.length);
    for (let i = 0; i < sampleSize; i++) {
      const img = allImages[i];
      console.log(`Sample ${i+1}:`, {
        src: img.src ? img.src.substring(0, 50) + '...' : 'no src',
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        classes: img.className,
        alt: img.alt || 'no alt'
      });
    }
  }
  
  allImages.forEach((img) => {
    processedCount++;
    
    // Debug image properties
    const imgWidth = img.naturalWidth || img.width;
    const imgHeight = img.naturalHeight || img.height;
    const src = img.src;
    const alt = img.alt || '';
    const classes = img.className || '';
    
    if (processedCount % 20 === 0 || processedCount <= 5) {
      console.log(`Examining image ${processedCount}/${allImages.length}: ${src ? src.substring(0, 50) + '...' : 'no src'}`);
      console.log(`  - Size: ${imgWidth}x${imgHeight}, Alt: "${alt.substring(0, 30)}...", Class: ${classes}`);
    }
    
    // Skip if already extracted, no src, too small, or data URL
    if (!src) {
      console.log(`Skipping image with no src`);
      return;
    }
    
    if (extractedUrls.has(src)) {
      skippedCount++;
      if (skippedCount % 20 === 0) console.log(`Skipped ${skippedCount} duplicate images so far`);
      return;
    }
    
    if (src.startsWith('data:')) {
      dataUrlCount++;
      if (dataUrlCount % 20 === 0) console.log(`Skipped ${dataUrlCount} data: URL images so far`);
      return;
    }
    
    // Special handling for Midjourney - don't filter by size for Midjourney images
    const minSize = isMidjourney ? 50 : 200; // Much smaller minimum for Midjourney
    
    if (imgWidth < minSize && imgHeight < minSize) {
      smallImageCount++;
      if (smallImageCount % 20 === 0) console.log(`Skipped ${smallImageCount} small images so far`);
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
    } else if (window.location.hostname.includes('discord')) {
      platform = 'discord';
    }
    
    // Get prompt from alt text or nearby elements
    let prompt = img.alt || img.title || '';
    
    // Special handling for Midjourney
    if (platform === 'midjourney') {
      if (!prompt) {
        // Look for prompt in various places
        
        // Try data-prompt attribute
        if (img.dataset && img.dataset.prompt) {
          prompt = img.dataset.prompt;
        }
        
        // Try parent element's data-prompt
        if (!prompt && img.parentElement && img.parentElement.dataset && img.parentElement.dataset.prompt) {
          prompt = img.parentElement.dataset.prompt;
        }
        
        // Try parent's parent element
        if (!prompt && img.parentElement && img.parentElement.parentElement) {
          const grandparent = img.parentElement.parentElement;
          if (grandparent.dataset && grandparent.dataset.prompt) {
            prompt = grandparent.dataset.prompt;
          }
        }
        
        // Try to find prompt text through closest selectors
        if (!prompt) {
          // Common Midjourney prompt containers
          const promptSelectors = [
            '.prompt-text',
            '.image-prompt',
            '.caption',
            '.card-text',
            '.job-text'
          ];
          
          for (const selector of promptSelectors) {
            // Try in parent or grandparent
            if (img.parentElement) {
              const promptElement = img.parentElement.querySelector(selector);
              if (promptElement && promptElement.textContent) {
                prompt = promptElement.textContent.trim();
                break;
              }
              
              // Try in grandparent
              if (!prompt && img.parentElement.parentElement) {
                const promptElement = img.parentElement.parentElement.querySelector(selector);
                if (promptElement && promptElement.textContent) {
                  prompt = promptElement.textContent.trim();
                  break;
                }
              }
            }
          }
        }
        
        // Look for nearby prompt text in button role elements (common in Midjourney UI)
        if (!prompt) {
          const nearbyText = img.closest('[role="button"]')?.parentElement?.textContent || '';
          if (nearbyText) {
            prompt = nearbyText;
          }
        }
      }
    } else if (!prompt && img.parentElement) {
      // Try to find prompt in parent elements for other platforms
      const promptElement = img.parentElement.querySelector('.prompt, [data-prompt], .caption, .description');
      if (promptElement) {
        prompt = promptElement.textContent || '';
      }
    }
    
    // Create image object with unique ID
    const uniqueId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    images.push({
      id: uniqueId,
      url: src,
      prompt: prompt.trim(),
      platform: platform,
      sourceURL: window.location.href,
      timestamp: Date.now(),
      type: 'image',
      width: imgWidth,
      height: imgHeight
    });
    
    extractedUrls.add(src);
  });

  console.log(`Image extraction summary:
- Total processed: ${processedCount}
- Extracted: ${images.length}
- Skipped duplicates: ${skippedCount}
- Skipped small images: ${smallImageCount}
- Skipped data URLs: ${dataUrlCount}
`);
  
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
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '8px';
  
  // Add icon
  const icon = document.createElement('span');
  
  if (type === 'error') {
    toast.style.background = '#f44336';
    toast.style.color = 'white';
    icon.innerHTML = '❌';
  } else if (type === 'success') {
    toast.style.background = '#4caf50';
    toast.style.color = 'white';
    icon.innerHTML = '✓';
  } else {
    toast.style.background = '#2196f3';
    toast.style.color = 'white';
    icon.innerHTML = 'ℹ️';
  }
  
  toast.prepend(icon);
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

// Send ready message to background script
function sendReadyMessage() {
  try {
    chrome.runtime.sendMessage({
      action: 'CONTENT_SCRIPT_READY',
      location: window.location.href
    });
  } catch (err) {
    console.error('Error sending ready message:', err);
  }
}

// Check if we're on a supported site and inject script
if (isSupportedSite()) {
  console.log('MainGallery.AI running on supported site:', window.location.hostname);
  injectScript();
  setupMutationObserver();
  sendReadyMessage();
  
  // Additional setup specifically for Midjourney
  if (window.location.hostname.includes('midjourney')) {
    console.log('Detected Midjourney site, setting up specialized handling');
    
    // Set up enhanced mutation observer for Midjourney's dynamic content
    const midjourneyObserver = new MutationObserver((mutations) => {
      let shouldScan = false;
      
      mutations.forEach(mutation => {
        // Look for added nodes that might be images or containers
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeName === 'IMG') {
              shouldScan = true;
              break;
            }
            
            // Check if the node contains images
            if (node.querySelectorAll) {
              const images = node.querySelectorAll('img');
              if (images.length > 0) {
                shouldScan = true;
                break;
              }
            }
          }
        }
      });
      
      if (shouldScan) {
        console.log('Midjourney observer detected new images, logging details');
        // Just log this detection - actual scanning happens on user action
        
        // Count visible images for debug purposes
        const visibleImages = document.querySelectorAll('img[src]:not([src^="data:"])');
        console.log(`Midjourney has ${visibleImages.length} visible images on page now`);
      }
    });
    
    // Observe Midjourney DOM for changes
    midjourneyObserver.observe(document.body, {
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['src']
    });
    
    console.log('Midjourney specialized observer set up');
  }
} else {
  console.log('MainGallery.AI not running on unsupported site:', window.location.hostname);
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  try {
    // Always respond to ping requests to establish connection
    if (request.action === 'ping' || request.action === 'PING') {
      console.log('Received ping, responding with pong');
      sendResponse({ success: true, action: 'pong', from: 'content_script' });
      return true;
    }
    
    if (request.action === 'extractImages') {
      if (!isSupportedSite()) {
        sendResponse({ images: [], success: false, reason: 'unsupported_site' });
        return true;
      }
      
      const result = extractImages();
      sendResponse(result);
      return true;
    } 
    else if (request.action === 'startAutoScan') {
      console.log('Starting auto-scanning with scrolling');
      
      if (!isSupportedSite()) {
        console.log('Not a supported site, not scanning');
        showToast('This site is not supported for image scanning', 'error');
        sendResponse({ success: false, reason: 'unsupported_site' });
        return true;
      }
      
      // Immediately send response that scan started (important to avoid connection errors)
      sendResponse({ success: true, status: 'scan_started' });
      
      // Start the auto-scan process
      try {
        // Auto-scroll to the bottom of the page
        autoScrollToBottom(800, 500).then(() => {
          console.log('Auto-scroll complete, extracting images');
          
          // After scrolling, extract all images
          const result = extractImages();
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
        }).catch(err => {
          console.error('Auto-scroll error:', err);
          showToast('Error during page scanning', 'error');
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
      
      return true; // we've already sent the response
    }
    else if (request.action === 'showUnsupportedTabToast') {
      const message = request.message || "Please switch to a supported AI platform (Midjourney, DALL·E, etc) to use MainGallery.AI";
      showToast(message, 'error');
      sendResponse({ success: true });
      return true;
    }
  } catch (err) {
    console.error('Error handling message in content script:', err);
    sendResponse({ success: false, error: err.message });
  }
  
  return true; // Keep channel open for async response
});

// Send initial ready message for monitoring
console.log('MainGallery.AI content script fully loaded and initialized');
notifyBackgroundScriptReady();
