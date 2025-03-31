
// Production URL for consistent redirects
const PRODUCTION_URL = 'https://main-gallery-hub.lovable.app';
const GALLERY_URL = `${PRODUCTION_URL}/gallery`;
const AUTH_URL = `${PRODUCTION_URL}/auth`;

// Check if user is logged in with token validation
function isLoggedIn() {
  return new Promise((resolve) => {
    // Check token in extension storage
    chrome.storage.sync.get(['main_gallery_auth_token'], (result) => {
      const token = result.main_gallery_auth_token;
      
      // Validate token exists and is not expired
      if (token) {
        const hasExpiry = token.expires_at !== undefined;
        const isExpired = hasExpiry && Date.now() > token.expires_at;
        
        if (!isExpired) {
          console.log('Valid auth token found');
          resolve(true);
          return;
        }
        
        console.log('Token expired, removing it');
        chrome.storage.sync.remove(['main_gallery_auth_token', 'main_gallery_user_email']);
      }
      
      // Also check localStorage as fallback (for web sessions)
      try {
        const localStorageCheck = () => {
          try {
            const tokenStr = localStorage.getItem('main_gallery_auth_token');
            if (tokenStr) {
              const token = JSON.parse(tokenStr);
              const hasExpiry = token.expires_at !== undefined;
              const isExpired = hasExpiry && Date.now() > token.expires_at;
              
              if (!isExpired) {
                console.log('Valid token found in localStorage');
                
                // Sync to Chrome storage
                chrome.storage.sync.set({
                  'main_gallery_auth_token': token,
                  'main_gallery_user_email': localStorage.getItem('main_gallery_user_email') || 'User'
                });
                
                return true;
              }
            }
            return false;
          } catch (e) {
            console.error('Error checking localStorage:', e);
            return false;
          }
        };
        
        // Try to execute localStorage check in active tab context
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0] && tabs[0].url && tabs[0].url.includes('main-gallery-hub.lovable.app')) {
            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              function: localStorageCheck
            }).then((results) => {
              if (results && results[0] && results[0].result) {
                resolve(true);
              } else {
                resolve(false);
              }
            }).catch(() => {
              resolve(false);
            });
          } else {
            resolve(false);
          }
        });
      } catch (e) {
        console.error('Error executing script:', e);
        resolve(false);
      }
    });
  });
}

// Extract images from the current active tab
function extractImagesFromActiveTab() {
  return new Promise((resolve) => {
    // Get active tab in current window
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs || !tabs[0] || !tabs[0].id) {
        console.log('No active tab found');
        resolve({ images: [], tabCount: 0 });
        return;
      }
      
      const tab = tabs[0];
      
      // Skip tabs without URLs or with chrome:// URLs
      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        console.log(`Skipping tab with URL: ${tab.url}`);
        resolve({ images: [], tabCount: 0 });
        return;
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
      
      // Try platform-specific extraction first if applicable
      if (platformId) {
        console.log(`Detected ${platformId} platform, using specialized extraction`);
        
        try {
          // Send message to content script for platform-specific extraction
          chrome.tabs.sendMessage(
            tab.id,
            { action: 'extractPlatformImages', platformId },
            (response) => {
              if (chrome.runtime.lastError) {
                console.log('Error extracting platform images, falling back to generic extraction');
                genericExtraction();
                return;
              }
              
              if (response && response.images && response.images.length > 0) {
                const processedImages = response.images.map(img => ({
                  ...img,
                  platform: platformId,
                  platformName: platformId.charAt(0).toUpperCase() + platformId.slice(1),
                  favicon: tab.favIconUrl || '',
                  tabUrl: tab.url,
                  tabTitle: tab.title,
                  timestamp: new Date().toISOString(),
                  type: 'image'
                }));
                
                console.log(`Extracted ${processedImages.length} platform-specific images`);
                resolve({ images: processedImages, tabCount: 1 });
              } else {
                console.log('No platform-specific images found, trying generic extraction');
                genericExtraction();
              }
            }
          );
        } catch (error) {
          console.error('Error with platform extractor:', error);
          genericExtraction();
        }
      } else {
        genericExtraction();
      }
      
      // Generic image extraction as fallback
      function genericExtraction() {
        try {
          chrome.scripting.executeScript({
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
                    timestamp: new Date().toISOString(),
                    sourceURL: window.location.href
                  };
                });
            }
          }, (results) => {
            if (chrome.runtime.lastError) {
              console.error(`Error injecting script: ${chrome.runtime.lastError.message}`);
              resolve({ images: [], tabCount: 0 });
              return;
            }
            
            if (results && results[0] && results[0].result) {
              const tabImages = results[0].result;
              console.log(`Extracted ${tabImages.length} generic images from tab ${tab.id}`);
              
              // Process the generic images
              if (tabImages && tabImages.length > 0) {
                const platformName = platformId ? 
                  platformId.charAt(0).toUpperCase() + platformId.slice(1) : 
                  tab.title.split(' ')[0];
                
                const processedImages = tabImages.map(img => ({
                  ...img,
                  platform: platformId || 'generic',
                  platformName: platformName,
                  favicon: tab.favIconUrl || '',
                  tabUrl: tab.url,
                  tabTitle: tab.title,
                  type: 'image'
                }));
                
                console.log(`Processed ${processedImages.length} images with metadata`);
                resolve({ images: processedImages, tabCount: 1 });
              } else {
                resolve({ images: [], tabCount: 0 });
              }
            } else {
              resolve({ images: [], tabCount: 0 });
            }
          });
        } catch (error) {
          console.error(`Error processing tab ${tab.id}:`, error);
          resolve({ images: [], tabCount: 0 });
        }
      }
    });
  });
}

// Open auth page for login
function openAuthPage(options = {}) {
  let authUrl = AUTH_URL;
  
  // Add any query parameters
  const searchParams = new URLSearchParams();
  if (options.redirect) searchParams.append('redirect', options.redirect);
  if (options.from) searchParams.append('from', options.from);
  
  const queryString = searchParams.toString();
  if (queryString) {
    authUrl += `?${queryString}`;
  }
  
  // Open the URL in a new tab
  chrome.tabs.create({ url: authUrl });
  console.log('Opened auth URL:', authUrl);
}

// Open the gallery
function openGallery() {
  chrome.tabs.create({ url: GALLERY_URL });
  console.log('Opened gallery:', GALLERY_URL);
}

// Sync images to gallery
function syncImagesToGallery(images) {
  console.log(`Starting sync of ${images.length} images to gallery`);
  
  // Find or open a gallery tab
  chrome.tabs.query({ url: `${PRODUCTION_URL}/gallery*` }, (tabs) => {
    if (tabs && tabs.length > 0) {
      // Gallery tab exists, focus and sync to it
      const tab = tabs[0];
      chrome.tabs.update(tab.id, { active: true }, () => {
        console.log('Found existing gallery tab, sending images');
        
        // Send message to bridge.js in the gallery tab
        chrome.tabs.sendMessage(tab.id, {
          action: 'syncImagesToGallery',
          images: images
        }, response => {
          if (chrome.runtime.lastError) {
            console.error('Error syncing to existing gallery tab:', chrome.runtime.lastError);
            openNewGalleryTab();
            return;
          }
          
          console.log('Images synced to existing gallery tab');
          
          // Show notification
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Images Synced',
            message: `Successfully synced ${images.length} images to MainGallery`
          });
        });
      });
    } else {
      openNewGalleryTab();
    }
  });
  
  function openNewGalleryTab() {
    // No gallery tab exists, create one and store images in storage for it to pick up
    console.log('Opening new gallery tab');
    
    // Store images temporarily in local storage
    chrome.storage.local.set({ 'maingallery_pending_images': images }, () => {
      chrome.tabs.create({ url: `${GALLERY_URL}?sync=true` }, newTab => {
        console.log('Created new gallery tab, images stored for pickup');
        
        // Show notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Images Ready',
          message: `${images.length} images ready to sync to MainGallery`
        });
      });
    });
  }
}

// Handle browser action (icon) click
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension icon clicked');
  
  // Check if the user is logged in
  const loggedIn = await isLoggedIn();
  
  if (!loggedIn) {
    console.log('User not logged in, redirecting to auth page');
    openAuthPage({ from: 'extension', redirect: 'gallery' });
    return;
  }
  
  // User is logged in, extract images from the active tab
  console.log('User logged in, extracting images from active tab');
  
  try {
    // Show a quick notification that scanning is in progress
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Scanning Active Tab',
      message: 'Looking for images to sync...'
    });
    
    // Extract images
    const { images } = await extractImagesFromActiveTab();
    
    if (!images || images.length === 0) {
      console.log('No images found in active tab');
      
      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'No Images Found',
        message: 'No images were found on the current page'
      });
      return;
    }
    
    console.log(`Found ${images.length} images in active tab`);
    
    // Sync images to gallery
    syncImagesToGallery(images);
    
  } catch (error) {
    console.error('Error during scan or sync:', error);
    
    // Show error notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Sync Error',
      message: 'There was an error syncing images. Please try again.'
    });
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
          
          // Open gallery in a new tab
          openGallery();
        }, 1000);
      });
    }
  }
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'galleryImagesReceived') {
    console.log(`Web app confirmed receipt of ${message.count} images`);
    
    // Show a confirmation notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Sync Complete',
      message: `${message.count} images synced to MainGallery`
    });
    
    sendResponse({ success: true });
  }
  
  // Return true to indicate async response
  return true;
});

console.log('MainGallery background script initialized');
