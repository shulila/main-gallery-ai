
// Production URL for consistent redirects
const PRODUCTION_URL = 'https://main-gallery-hub.lovable.app';
const GALLERY_URL = `${PRODUCTION_URL}/gallery`;
const AUTH_URL = `${PRODUCTION_URL}/auth`;

// Global variable for the notification util
let createNotification;

// Initialize utilities - proper pattern for service workers
async function initUtils() {
  try {
    const { default: notificationModule } = await import('./utils/notifications.js');
    createNotification = notificationModule.createNotification;
    console.log('Notification utility loaded successfully');
  } catch (error) {
    console.error('Failed to load notification utility:', error);
    // Fallback notification function if import fails
    createNotification = (id, title, message) => {
      chrome.notifications.create(id, {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: title,
        message: message,
      });
    };
  }
}

// Safe initialization function that doesn't use top-level await
function initialize() {
  console.log('MainGallery background script initializing...');
  
  // Initialize utilities without using top-level await
  initUtils().then(() => {
    console.log('MainGallery extension initialized successfully');
  }).catch(error => {
    console.error('Error during initialization:', error);
  });
}

// Run initialization
initialize();

// Check if user is logged in with token validation
async function isLoggedIn() {
  try {
    // Check token in extension storage
    const result = await chrome.storage.sync.get(['main_gallery_auth_token']);
    const token = result.main_gallery_auth_token;
    
    // Validate token exists and is not expired
    if (token) {
      const hasExpiry = token.expires_at !== undefined;
      const isExpired = hasExpiry && Date.now() > token.expires_at;
      
      if (!isExpired) {
        console.log('Valid auth token found');
        return true;
      }
      
      console.log('Token expired, removing it');
      await chrome.storage.sync.remove(['main_gallery_auth_token', 'main_gallery_user_email']);
    } else {
      console.log('No auth token found in storage');
    }
  } catch (error) {
    console.error('Error checking login status:', error);
  }
  
  return false;
}

// Domain and path verification
async function isSupportedURL(url) {
  if (!url) return false;
  
  // Skip chrome:// URLs and extension pages
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
    return false;
  }
  
  try {
    const urlObj = new URL(url);
    
    // List of supported domains
    const supportedDomains = [
      'midjourney.com',
      'www.midjourney.com',
      'openai.com',
      'leonardo.ai',
      'www.leonardo.ai',
      'runwayml.com',
      'www.runwayml.com',
      'pika.art',
      'www.pika.art'
    ];
    
    // List of supported paths/routes
    const supportedPaths = [
      '/imagine',
      '/archive',
      '/app',
      '/feed',
      '/gallery',
      '/create',
      '/generations',
      '/projects'
    ];
    
    // Check if domain is supported
    const isDomainSupported = supportedDomains.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );
    
    // Check if path is supported
    const isPathSupported = supportedPaths.some(path => 
      urlObj.pathname === path || urlObj.pathname.startsWith(path)
    );
    
    return isDomainSupported && isPathSupported;
  } catch (error) {
    console.error('Error parsing URL:', error);
    return false;
  }
}

// Extract images from the current active tab
async function extractImagesFromActiveTab() {
  try {
    // Get active tab in current window
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tabs || !tabs[0] || !tabs[0].id) {
      console.log('No active tab found');
      return { images: [], success: false, reason: 'no_tab' };
    }
    
    const tab = tabs[0];
    
    // Skip tabs without URLs or with chrome:// URLs
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      console.log(`Skipping tab with URL: ${tab.url}`);
      return { images: [], success: false, reason: 'invalid_url' };
    }
    
    // Check if the tab is from a supported domain
    const isSupported = await isSupportedURL(tab.url);
    
    if (!isSupported) {
      console.log(`Tab URL not supported: ${tab.url}`);
      return { images: [], success: false, reason: 'unsupported_url' };
    }
    
    // Show notification that scanning is starting
    if (createNotification) {
      createNotification(
        'maingallery_scanning', 
        'Scanning Current Tab', 
        'Looking for AI creations...'
      );
    }
    
    console.log(`Extracting images from active tab: ${tab.url}`);
    
    // Detect platform for specialized extraction
    let platformId = null;
    
    if (tab.url.includes('midjourney.com')) {
      platformId = 'midjourney';
    } else if (tab.url.includes('openai.com')) {
      platformId = 'dalle';
    } else if (tab.url.includes('dreamstudio.ai') || tab.url.includes('stability.ai')) {
      platformId = 'stableDiffusion';
    } else if (tab.url.includes('runwayml.com')) {
      platformId = 'runway';
    } else if (tab.url.includes('pika.art')) {
      platformId = 'pika';
    } else if (tab.url.includes('leonardo.ai')) {
      platformId = 'leonardo';
    } else if (tab.url.includes('discord.com/channels') && tab.url.includes('midjourney')) {
      platformId = 'midjourney';
    }
    
    // Try platform-specific extraction with auto-scroll
    if (platformId) {
      console.log(`Detected ${platformId} platform, using specialized extraction with auto-scroll`);
      
      try {
        // First, inject the auto-scroll functionality and wait for it to complete
        const scrollResult = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: async function() {
            return new Promise((resolve) => {
              let lastHeight = document.body.scrollHeight;
              let scrollCount = 0;
              const maxScrolls = 10; // Limit scrolling attempts
              let newImagesFound = 0;
              let previousImageCount = document.querySelectorAll('img').length;
              
              console.log(`Starting auto-scroll, found ${previousImageCount} images initially`);
              
              // Show scroll progress indicator
              const createScrollIndicator = () => {
                const indicator = document.createElement('div');
                indicator.id = 'mg-scroll-indicator';
                indicator.style.cssText = `
                  position: fixed;
                  top: 20px;
                  right: 20px;
                  background: rgba(0, 0, 0, 0.8);
                  color: white;
                  padding: 10px 15px;
                  border-radius: 8px;
                  font-family: sans-serif;
                  z-index: 99999;
                  transition: opacity 0.3s;
                `;
                indicator.textContent = 'MainGallery: Scanning page... 0%';
                document.body.appendChild(indicator);
                return indicator;
              };
              
              const indicator = createScrollIndicator();
              
              const scrollInterval = setInterval(() => {
                // Scroll down
                window.scrollTo(0, document.body.scrollHeight);
                
                scrollCount++;
                
                // Update indicator
                const progress = Math.min(Math.round((scrollCount / maxScrolls) * 100), 100);
                if (indicator) {
                  indicator.textContent = `MainGallery: Scanning page... ${progress}%`;
                }
                
                // After a small delay, check if we've loaded new content
                setTimeout(() => {
                  // Check if we found new images
                  const currentImageCount = document.querySelectorAll('img').length;
                  if (currentImageCount > previousImageCount) {
                    newImagesFound += (currentImageCount - previousImageCount);
                    console.log(`Found ${currentImageCount - previousImageCount} new images`);
                    previousImageCount = currentImageCount;
                  }
                  
                  const newHeight = document.body.scrollHeight;
                  
                  // If we've reached the bottom or max scroll attempts
                  if (newHeight === lastHeight || scrollCount >= maxScrolls) {
                    clearInterval(scrollInterval);
                    
                    // Hide indicator with fade out
                    if (indicator) {
                      indicator.style.opacity = '0';
                      setTimeout(() => indicator.remove(), 300);
                    }
                    
                    // Scroll back to top
                    window.scrollTo(0, 0);
                    
                    console.log(`Scroll complete: ${scrollCount} scrolls performed, found ${newImagesFound} new images`);
                    resolve({
                      scrolled: true,
                      scrollAttempts: scrollCount,
                      newImagesFound: newImagesFound,
                      totalImageCount: currentImageCount
                    });
                  }
                  
                  lastHeight = newHeight;
                }, 1000);
              }, 1500);
            });
          }
        });
        
        if (scrollResult && scrollResult[0] && scrollResult[0].result) {
          console.log('Auto-scroll completed:', scrollResult[0].result);
        }
        
        // Now extract images after scrolling
        const response = await chrome.tabs.sendMessage(
          tab.id,
          { action: 'extractPlatformImages', platformId }
        );
        
        if (response && response.images && response.images.length > 0) {
          const processedImages = response.images.map(img => ({
            ...img,
            platform: platformId,
            platformName: platformId.charAt(0).toUpperCase() + platformId.slice(1),
            favicon: tab.favIconUrl || '',
            tabUrl: tab.url,
            tabTitle: tab.title,
            timestamp: Date.now(),
            sourceURL: tab.url,
            type: 'image',
            fromSupportedDomain: true
          }));
          
          console.log(`Extracted ${processedImages.length} platform-specific images`);
          return { images: processedImages, success: true };
        } else {
          console.log('No platform-specific images found, trying generic extraction');
          return await genericExtraction(tab);
        }
      } catch (error) {
        console.error('Error with platform extractor:', error);
        return await genericExtraction(tab);
      }
    } else {
      return await genericExtraction(tab);
    }
  } catch (error) {
    console.error('Error extracting images:', error);
    return { images: [], success: false, reason: 'error' };
  }
}

// Generic image extraction as fallback
async function genericExtraction(tab) {
  try {
    console.log('Performing generic image extraction with auto-scroll');
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: function() {
        // This function runs in the context of the tab
        const images = Array.from(document.querySelectorAll('img'));
        return images
          .filter(img => (
            img.src && 
            !img.src.startsWith('data:') && 
            img.width > 100 && 
            img.height > 100
          ))
          .map(img => {
            // Find nearby text that might be a prompt
            let prompt = img.alt || img.title || '';
            if (!prompt) {
              // Check for nearby text elements that might contain prompts
              const parent = img.parentElement;
              const siblings = parent ? Array.from(parent.children) : [];
              
              for (const sibling of siblings) {
                if (sibling !== img && sibling.textContent && sibling.textContent.trim().length > 10) {
                  prompt = sibling.textContent.trim();
                  break;
                }
              }
              
              if (!prompt) {
                // Check parent's siblings
                const grandparent = parent?.parentElement;
                const parentSiblings = grandparent ? Array.from(grandparent.children) : [];
                
                for (const sibling of parentSiblings) {
                  if (sibling !== parent && sibling.textContent && sibling.textContent.trim().length > 10) {
                    prompt = sibling.textContent.trim();
                    break;
                  }
                }
              }
            }
            
            return {
              src: img.src,
              url: img.src,
              alt: img.alt || '',
              title: img.title || '',
              prompt: prompt || document.title,
              naturalWidth: img.naturalWidth || img.width,
              naturalHeight: img.naturalHeight || img.height,
              domain: window.location.hostname,
              path: window.location.pathname,
              pageTitle: document.title,
              timestamp: Date.now(),
              sourceURL: window.location.href
            };
          });
      }
    });
    
    if (results && results[0] && results[0].result) {
      const tabImages = results[0].result;
      console.log(`Extracted ${tabImages.length} generic images from tab ${tab.id}`);
      
      // Process the generic images
      if (tabImages && tabImages.length > 0) {
        const platformName = new URL(tab.url).hostname.split('.')[0];
        
        const processedImages = tabImages.map(img => ({
          ...img,
          platform: 'generic',
          platformName: platformName.charAt(0).toUpperCase() + platformName.slice(1),
          favicon: tab.favIconUrl || '',
          tabUrl: tab.url,
          tabTitle: tab.title,
          type: 'image',
          sourceURL: tab.url,
          fromSupportedDomain: true
        }));
        
        console.log(`Processed ${processedImages.length} images with metadata`);
        return { images: processedImages, success: true };
      }
    }
    
    return { images: [], success: false, reason: 'no_images' };
  } catch (error) {
    console.error(`Error in generic extraction:`, error);
    return { images: [], success: false, reason: 'error' };
  }
}

// Sync images to gallery
async function syncImagesToGallery(images) {
  console.log(`Starting sync of ${images.length} images to gallery`);
  
  // Find or open a gallery tab
  const tabs = await chrome.tabs.query({ url: `${PRODUCTION_URL}/gallery*` });
  
  if (tabs && tabs.length > 0) {
    // Gallery tab exists, focus and sync to it
    const tab = tabs[0];
    await chrome.tabs.update(tab.id, { active: true });
    console.log('Found existing gallery tab, sending images');
    
    try {
      // Send message to bridge.js in the gallery tab
      await chrome.tabs.sendMessage(tab.id, {
        action: 'syncImagesToGallery',
        images: images
      });
      
      console.log('Images synced to existing gallery tab');
      
      // Show notification
      if (createNotification) {
        createNotification(
          'maingallery_sync_success', 
          'Images Synced', 
          `Successfully synced ${images.length} images to MainGallery`
        );
      }
      
      return true;
    } catch (error) {
      console.error('Error syncing to existing gallery tab:', error);
      return await openNewGalleryTab(images);
    }
  } else {
    return await openNewGalleryTab(images);
  }
}

async function openNewGalleryTab(images) {
  // No gallery tab exists, create one and store images for it to pick up
  console.log('Opening new gallery tab');
  
  // Store images temporarily in local storage
  await chrome.storage.local.set({ 'maingallery_pending_images': images });
  
  // Create new tab with sync parameter
  const newTab = await chrome.tabs.create({ url: `${GALLERY_URL}?sync=true&from=extension` });
  
  console.log('Created new gallery tab, images stored for pickup');
  
  // Show notification
  if (createNotification) {
    createNotification(
      'maingallery_sync_ready', 
      'Images Ready', 
      `${images.length} images ready to sync to MainGallery`
    );
  }
  
  return true;
}

// Open auth page for login
async function openAuthPage() {
  const authUrl = `${AUTH_URL}?from=extension&redirect=gallery`;
  console.log('Opening auth URL:', authUrl);
  await chrome.tabs.create({ url: authUrl });
}

// Main action handler - triggered when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension icon clicked in tab:', tab.url);
  
  try {
    // Check if the user is logged in
    const loggedIn = await isLoggedIn();
    
    if (!loggedIn) {
      console.log('User not logged in, redirecting to auth page');
      await openAuthPage();
      return;
    }
    
    // Check if current tab is from a supported platform
    const isSupported = await isSupportedURL(tab.url);
    
    if (!isSupported) {
      console.log('Current tab is not from a supported platform:', tab.url);
      
      // Show notification about unsupported platform
      if (createNotification) {
        createNotification(
          'maingallery_unsupported_url', 
          'Unsupported Platform', 
          'Please open Midjourney, DALL·E or another supported AI platform to sync images'
        );
      }
      
      return;
    }
    
    // User is logged in and tab is supported, extract images from the active tab
    console.log('User logged in, extracting images from active tab');
    
    const { images, success, reason } = await extractImagesFromActiveTab();
    
    if (!success || !images || images.length === 0) {
      console.log('No images found in active tab, reason:', reason);
      
      let title = 'No Images Found';
      let message = 'No images were found on the current page';
      
      if (reason === 'unsupported_url') {
        title = 'Unsupported Page';
        message = 'Please open Midjourney, DALL·E or another supported AI platform to sync images';
      } else if (reason === 'error') {
        title = 'Extraction Error';
        message = 'There was a problem extracting images from this page';
      }
      
      // Show notification
      if (createNotification) {
        createNotification(
          'maingallery_no_images', 
          title, 
          message
        );
      }
      return;
    }
    
    console.log(`Found ${images.length} images in active tab`);
    
    // Sync images to gallery
    await syncImagesToGallery(images);
    
  } catch (error) {
    console.error('Error during scan or sync:', error);
    
    // Show error notification
    if (createNotification) {
      createNotification(
        'maingallery_error', 
        'Sync Error', 
        'There was an error syncing images. Please try again.'
      );
    }
  }
});

// Listen for tab updates to specifically detect gallery page with sync request
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && 
      tab.url && 
      tab.url.includes('main-gallery-hub.lovable.app/gallery') && 
      tab.url.includes('sync=true')) {
    
    console.log('Detected gallery page load with sync=true param');
    
    // Get pending images from storage and send after a delay to ensure page is ready
    setTimeout(() => {
      chrome.storage.local.get(['maingallery_pending_images'], result => {
        const pendingImages = result.maingallery_pending_images || [];
        
        if (pendingImages.length > 0) {
          console.log(`Sending ${pendingImages.length} pending images to gallery tab`);
          
          // Send images to the gallery tab
          chrome.tabs.sendMessage(tabId, {
            action: 'syncImagesToGallery',
            images: pendingImages
          }, response => {
            if (chrome.runtime.lastError) {
              console.error('Error syncing to gallery:', chrome.runtime.lastError);
              return;
            }
            
            console.log('Images synced to gallery tab');
            
            // Clear pending images from storage
            chrome.storage.local.remove(['maingallery_pending_images']);
            
            // Show notification
            if (createNotification) {
              createNotification(
                'maingallery_sync_complete', 
                'Sync Complete', 
                `${pendingImages.length} images synced to MainGallery`
              );
            }
          });
        }
      });
    }, 2000);
  }
});

// Handle authentication callback detection
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && 
      tab.url.includes('main-gallery-hub.lovable.app/auth/callback')) {
    
    console.log('Auth callback detected:', tab.url);
    
    // Get auth token from the URL
    const url = new URL(tab.url);
    const accessToken = url.hash ? new URLSearchParams(url.hash.substring(1)).get('access_token') : null;
    const refreshToken = url.hash ? new URLSearchParams(url.hash.substring(1)).get('refresh_token') : null;
    const userEmail = url.hash ? new URLSearchParams(url.hash.substring(1)).get('email') : null;
    
    // If we have tokens, store them
    if (accessToken) {
      console.log('Auth tokens detected, storing session');
      
      // Store basic token info with expiry time
      chrome.storage.sync.set({
        'main_gallery_auth_token': {
          access_token: accessToken,
          refresh_token: refreshToken,
          timestamp: Date.now(),
          expires_at: Date.now() + (24 * 60 * 60 * 1000) // 24 hours validity
        },
        'main_gallery_user_email': userEmail || 'User'
      }, () => {
        console.log('Auth token stored in extension storage');
        
        // Close the auth tab after successful login
        setTimeout(() => {
          chrome.tabs.remove(tabId);
        }, 1000);
      });
    }
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'galleryImagesReceived') {
    console.log(`Web app confirmed receipt of ${message.count} images`);
    
    // Show a confirmation notification
    if (createNotification) {
      createNotification(
        'maingallery_sync_confirmed', 
        'Sync Complete', 
        `${message.count} images synced to MainGallery`
      );
    }
    
    sendResponse({ success: true });
  }
  
  // Return true to indicate async response
  return true;
});

console.log('MainGallery background script initialized with domain-restricted one-click flow');
