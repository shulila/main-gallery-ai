
// MainGallery background script
console.log('MainGallery.AI: background script initialized');

// Import auth utilities
import { 
  isLoggedIn, 
  openAuthPage, 
  setupAuthCallbackListener, 
  getGalleryUrl 
} from './utils/auth.js';

// Helper function to check if URL is from a supported AI platform
function checkSupportedURL(url) {
  if (!url) return false;
  
  // Skip chrome:// URLs and extension pages
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
    return false;
  }
  
  try {
    const urlObj = new URL(url);
    
    // Supported domains
    const supportedDomains = [
      'midjourney.com',
      'www.midjourney.com',
      'openai.com',
      'leonardo.ai',
      'app.leonardo.ai',
      'runwayml.com',
      'pika.art',
      'dreamstudio.ai',
      'stability.ai',
      'playgroundai.com',
      'creator.nightcafe.studio'
    ];
    
    // Supported paths
    const supportedPaths = [
      '/app',
      '/archive',
      '/create',
      '/organize',
      '/generate',
      '/workspace',
      '/dall-e'
    ];
    
    // Check domain match
    const isDomainSupported = supportedDomains.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );
    
    // Check if path is supported
    const isPathSupported = supportedPaths.some(path => 
      urlObj.pathname === path || urlObj.pathname.startsWith(path)
    );
    
    // Special case for OpenAI
    if (urlObj.hostname.includes('openai.com') && urlObj.pathname.includes('/dall-e')) {
      return true;
    }
    
    // Special case for Midjourney - accept any URL on midjourney.com
    if (urlObj.hostname.includes('midjourney.com')) {
      return true;
    }
    
    return isDomainSupported && isPathSupported;
  } catch (error) {
    console.error('Error parsing URL:', error);
    return false;
  }
}

// Create notification
function createNotification(id, title, message) {
  try {
    chrome.notifications.create(id, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: title,
      message: message
    });
  } catch (err) {
    console.error('Error creating notification:', err);
  }
}

// Set up the auth callback listener immediately
setupAuthCallbackListener();

// Helper function to safely send messages with retry
function safeSendMessage(tabId, message, callback, maxRetries = 3) {
  let retryCount = 0;
  
  function attemptSend() {
    try {
      // Check if tab exists first
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          console.error('Tab does not exist:', chrome.runtime.lastError);
          if (callback) callback({ success: false, error: 'Tab does not exist' });
          return;
        }
        
        // Tab exists, now try to send message
        chrome.tabs.sendMessage(tabId, message, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error sending message:', chrome.runtime.lastError);
            
            if (retryCount < maxRetries) {
              console.log(`Retry attempt ${retryCount + 1}/${maxRetries}...`);
              retryCount++;
              setTimeout(attemptSend, 500 * retryCount); // Exponential backoff
            } else {
              console.error('Max retries reached, message could not be delivered');
              
              // If this is a scan request and failed, try to inject content script again
              if (message.action === 'startAutoScan' && retryCount >= maxRetries) {
                console.log('Trying to inject content script before final attempt');
                
                try {
                  chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content.js']
                  }).then(() => {
                    console.log('Content script injected, waiting before final attempt');
                    setTimeout(() => {
                      chrome.tabs.sendMessage(tabId, message, (finalResponse) => {
                        if (chrome.runtime.lastError) {
                          console.error('Final attempt failed:', chrome.runtime.lastError);
                          if (callback) callback({ 
                            success: false, 
                            error: chrome.runtime.lastError.message,
                            injectionAttempted: true
                          });
                        } else {
                          if (callback) callback(finalResponse || { success: true });
                        }
                      });
                    }, 1000);
                  }).catch(err => {
                    console.error('Error injecting content script:', err);
                    if (callback) callback({ success: false, error: 'Content script injection failed' });
                  });
                } catch (err) {
                  console.error('Error in injection logic:', err);
                  if (callback) callback({ success: false, error: err.message });
                }
              } else {
                if (callback) callback({ success: false, error: chrome.runtime.lastError.message });
              }
            }
          } else {
            if (callback) callback(response || { success: true });
          }
        });
      });
    } catch (err) {
      console.error('Exception sending message:', err);
      if (callback) callback({ success: false, error: err.message });
    }
  }
  
  attemptSend();
}

// Ping a tab to check if content script is ready
function pingTab(tabId, callback) {
  try {
    chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Content script not ready:', chrome.runtime.lastError);
        if (callback) callback(false);
      } else {
        console.log('Content script is ready:', response);
        if (callback) callback(true);
      }
    });
  } catch (err) {
    console.error('Error pinging tab:', err);
    if (callback) callback(false);
  }
}

// Function to ensure content script is loaded
function ensureContentScriptLoaded(tab, callback) {
  if (!tab || !tab.id) {
    console.error('Invalid tab');
    if (callback) callback(false);
    return;
  }
  
  // First try pinging to see if content script is already loaded
  pingTab(tab.id, (isReady) => {
    if (isReady) {
      if (callback) callback(true);
      return;
    }
    
    // Content script not loaded, inject it
    console.log('Content script not ready, injecting...');
    
    try {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      }).then(() => {
        console.log('Content script injected, waiting for initialization');
        
        // Give it time to initialize
        setTimeout(() => {
          pingTab(tab.id, (isNowReady) => {
            if (callback) callback(isNowReady);
          });
        }, 1000);
      }).catch(err => {
        console.error('Error injecting content script:', err);
        if (callback) callback(false);
      });
    } catch (err) {
      console.error('Exception injecting script:', err);
      if (callback) callback(false);
    }
  });
}

// Handle action/icon clicks
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension icon clicked on tab:', tab?.url);
  
  if (!tab || !tab.url || !tab.id) {
    console.error('Invalid tab or missing URL/ID');
    return;
  }
  
  // Check if URL is supported
  const supported = checkSupportedURL(tab.url);
  console.log('URL supported:', supported, tab.url);
  
  // Check login status
  const loggedIn = await isLoggedIn();
  console.log('User logged in:', loggedIn);
  
  // Handle unsupported site
  if (!supported) {
    console.log('Tab URL not supported');
    
    if (loggedIn) {
      // Redirect to gallery if logged in
      chrome.tabs.create({ url: getGalleryUrl() });
    } else {
      // Redirect to auth page if not logged in
      openAuthPage(null, { redirect: 'gallery', from: 'extension' });
    }
    
    // Show notification to inform user
    createNotification(
      'maingallery_unsupported_tab', 
      'Unsupported Site', 
      'Please switch to a supported AI platform like Midjourney or DALL-E to use MainGallery.'
    );
    
    return;
  }
  
  // Handle supported site
  if (!loggedIn) {
    console.log('User not logged in, redirecting to auth page');
    openAuthPage(null, { redirect: 'gallery', from: 'extension' });
    return;
  }
  
  console.log('User is logged in and on a supported tab, starting auto-scan');
  
  // Ensure content script is loaded
  ensureContentScriptLoaded(tab, (isReady) => {
    if (!isReady) {
      console.error('Content script could not be loaded');
      createNotification(
        'maingallery_error', 
        'Scan Error', 
        'Could not initialize scanner. Please refresh the page and try again.'
      );
      return;
    }
    
    // Content script is ready, send scan message
    safeSendMessage(
      tab.id, 
      { 
        action: 'startAutoScan',
        options: { scrollDelay: 500, scrollStep: 800 }
      },
      (response) => {
        if (response && response.success) {
          console.log('Auto-scan initiated on page');
          
          createNotification(
            'maingallery_scan_started', 
            'Scanning Started', 
            'MainGallery is scanning the page for AI images. Please keep the tab open.'
          );
        } else {
          console.log('Auto-scan could not be started, will retry:', response);
          
          // Already tried in safeSendMessage's auto-retry but failed
          // Show error to user
          createNotification(
            'maingallery_error', 
            'Scan Error', 
            'Could not scan the current page. Please refresh and try again.'
          );
        }
      }
    );
  });
});

// Handle messages from content scripts with improved error handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received in background script:', message);
  
  try {
    if (message.action === 'CONTENT_SCRIPT_READY') {
      console.log('Content script ready on:', message.location);
      sendResponse({ success: true });
    }
    else if (message.action === 'log') {
      console.log('FROM CONTENT SCRIPT:', message.data);
      sendResponse({ success: true });
    } 
    else if (message.action === 'openAuthPage') {
      openAuthPage(null, message);
      sendResponse({ success: true });
    } 
    else if (message.action === 'scanComplete') {
      // Handle scan complete message from content script
      console.log('Scan completed with', message.images?.length || 0, 'images');
      
      // Sync the images to gallery
      if (message.images && message.images.length > 0) {
        syncImagesToGallery(message.images);
        
        // Show success notification
        createNotification(
          'maingallery_sync_success', 
          'Images Synced', 
          `${message.images.length} images were found and synced to your gallery`
        );
      } else {
        // Show no images found notification
        createNotification(
          'maingallery_no_images', 
          'No Images Found', 
          'No AI images were found on this page.'
        );
      }
      
      sendResponse({ success: true });
    }
    else if (message.action === 'galleryReady') {
      console.log('Gallery is ready to receive images:', message);
      sendResponse({ success: true });
    }
    else if (message.action === 'bridgeConnected') {
      console.log('Bridge connected on:', message.host, message.path);
      sendResponse({ success: true });
    }
    else {
      // Default response for unhandled messages
      sendResponse({ success: true, action: 'default' });
    }
  } catch (err) {
    console.error('Error handling message:', err);
    sendResponse({ success: false, error: err.message });
  }
  
  return true; // Keep message channel open for async response
});

// Implement image syncing with improved error handling
async function syncImagesToGallery(images) {
  if (!images || images.length === 0) {
    console.log('No images to sync');
    return false;
  }
  
  try {
    // Add metadata
    const enrichedImages = images.map(img => ({
      ...img,
      timestamp: img.timestamp || Date.now(),
      synced_at: Date.now()
    }));
    
    // Check if gallery tab is already open
    const galleryTabQuery = { url: `${getGalleryUrl()}*` };
    
    // Using promise-based approach to better handle errors
    try {
      const tabs = await chrome.tabs.query(galleryTabQuery);
      
      if (tabs.length > 0) {
        // If gallery is open, try to send messages through bridge
        console.log('Gallery tab found, sending images via bridge');
        
        try {
          // First try sending message to the tab
          safeSendMessage(
            tabs[0].id, 
            { type: 'GALLERY_IMAGES', images: enrichedImages }, 
            (response) => {
              if (response && response.success) {
                console.log('Successfully sent images to gallery tab:', response);
                // Focus the gallery tab
                chrome.tabs.update(tabs[0].id, { active: true });
              } else {
                console.error('Error sending to gallery tab:', response?.error || 'Unknown error');
                // Fallback to opening a new gallery tab
                openGalleryWithImages(enrichedImages);
              }
            }
          );
        } catch (err) {
          console.error('Error sending to gallery tab:', err);
          // Fallback to opening a new gallery tab
          openGalleryWithImages(enrichedImages);
        }
      } else {
        // Open gallery in a new tab with images
        openGalleryWithImages(enrichedImages);
      }
      
      return true;
    } catch (err) {
      console.error('Error querying gallery tabs:', err);
      // Fallback: just open a new gallery tab
      openGalleryWithImages(enrichedImages);
      return true;
    }
  } catch (err) {
    console.error('Error syncing images to gallery:', err);
    return false;
  }
}

// Open gallery with images to sync
function openGalleryWithImages(images) {
  // Create gallery tab with sync flag
  chrome.tabs.create({ url: `${getGalleryUrl()}?sync=true&from=extension` }, (tab) => {
    if (!tab) {
      console.error('Failed to create gallery tab');
      return;
    }

    console.log('Opened gallery tab with sync flag, tab ID:', tab.id);
    
    // Set up listener for when gallery tab is ready
    chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, updatedTab) {
      if (tabId === tab.id && changeInfo.status === 'complete' && 
          updatedTab.url && updatedTab.url.includes(getGalleryUrl())) {
        
        console.log('Gallery tab fully loaded, waiting to ensure bridge is ready');
        
        // Wait a bit to ensure the page is fully loaded and bridge script is injected
        setTimeout(() => {
          try {
            safeSendMessage(
              tabId,
              { type: 'GALLERY_IMAGES', images: images },
              (response) => {
                if (response && response.success) {
                  console.log('Successfully sent images to new gallery tab');
                } else {
                  console.error('Error sending images to new tab:', response?.error || 'Unknown error');
                  
                  // Store images in session storage as fallback
                  chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: (imagesJson) => {
                      try {
                        window.sessionStorage.setItem('maingallery_sync_images', imagesJson);
                        console.log('Stored images in session storage for gallery to pick up');
                        
                        // Notify the page
                        window.postMessage({
                          type: 'GALLERY_SYNC_STORAGE',
                          count: JSON.parse(imagesJson).length,
                          timestamp: Date.now()
                        }, '*');
                      } catch (e) {
                        console.error('Error storing images in session storage:', e);
                      }
                    },
                    args: [JSON.stringify(images)]
                  }).catch(err => {
                    console.error('Error executing session storage script:', err);
                  });
                }
              }
            );
          } catch (err) {
            console.error('Error sending images to new tab:', err);
          }
        }, 2000); // Increased delay to ensure page and bridge are ready
        
        chrome.tabs.onUpdated.removeListener(listener);
      }
    });
  });
}
