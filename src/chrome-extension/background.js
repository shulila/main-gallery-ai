
// MainGallery background script
console.log('MainGallery.AI: background script initialized');

// Utility to validate if token is valid from chrome.storage
async function isLoggedIn() {
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get(['main_gallery_auth_token'], (result) => {
        const token = result.main_gallery_auth_token;
        if (token && token.access_token) {
          const isExpired = token.expires_at && Date.now() > token.expires_at;
          if (!isExpired) {
            return resolve(true);
          }
          chrome.storage.sync.remove(['main_gallery_auth_token'], () => resolve(false));
        } else {
          resolve(false);
        }
      });
    } catch (err) {
      console.error('Error in isLoggedIn:', err);
      resolve(false);
    }
  });
}

// Open auth page with proper query parameters
function openAuthPage(tabId = null, options = {}) {
  const authUrl = new URL('https://main-gallery-hub.lovable.app/auth');
  
  // Add query parameters
  Object.entries(options).forEach(([key, value]) => {
    authUrl.searchParams.append(key, value);
  });

  // Open URL in existing tab or create new tab
  if (tabId) {
    chrome.tabs.update(tabId, { url: authUrl.toString() });
  } else {
    chrome.tabs.create({ url: authUrl.toString() });
  }
  
  console.log('Opened auth URL:', authUrl.toString());
}

// Check if URL is from a supported AI platform
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
    
    // Check domain and path match
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

// Action handler for extension icon clicks
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension icon clicked on tab:', tab.url);
  
  if (!tab || !tab.url || !tab.id) {
    console.log('Invalid tab or missing URL/ID');
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
      chrome.tabs.create({ url: 'https://main-gallery-hub.lovable.app/gallery' });
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
  
  // Send message to content script to start auto-scanning
  try {
    chrome.tabs.sendMessage(tab.id, { 
      action: 'startAutoScan',
      options: { scrollDelay: 500, scrollStep: 800 }
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error starting auto-scan:', chrome.runtime.lastError);
        
        // Try to inject content script directly if messaging fails
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }).then(() => {
          // Retry message after injection
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { 
              action: 'startAutoScan',
              options: { scrollDelay: 500, scrollStep: 800 }
            }).catch(err => {
              console.error('Error in second attempt to start auto-scan:', err);
              createNotification(
                'maingallery_error', 
                'Scan Error', 
                'Could not scan the current page. Please refresh and try again.'
              );
            });
          }, 500);
        }).catch(err => {
          console.error('Error injecting content script:', err);
          createNotification(
            'maingallery_error', 
            'Scan Error', 
            'Could not scan the current page. Please refresh and try again.'
          );
        });
        
        return;
      }
      
      if (response && response.success) {
        console.log('Auto-scan initiated on page');
        
        createNotification(
          'maingallery_scan_started', 
          'Scanning Started', 
          'MainGallery is scanning the page for AI images. Please keep the tab open.'
        );
      } else {
        console.log('Auto-scan could not be started:', response);
        
        createNotification(
          'maingallery_error', 
          'Scan Error', 
          'Could not scan this page. Please refresh and try again.'
        );
      }
    });
  } catch (err) {
    console.error('Error sending startAutoScan message:', err);
    
    createNotification(
      'maingallery_error', 
      'Error Scanning Page', 
      'Could not scan the current page. Please try again.'
    );
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received in background script:', message);
  
  try {
    if (message.action === 'log') {
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
  } catch (err) {
    console.error('Error handling message:', err);
    sendResponse({ success: false, error: err.message });
  }
  
  return true; // Keep message channel open for async response
});

// Implement image syncing
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
    
    // Send to web app or store for later
    chrome.tabs.query({ url: 'https://main-gallery-hub.lovable.app/gallery*' }, (tabs) => {
      if (tabs.length > 0) {
        // If gallery is open, send message
        try {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'GALLERY_IMAGES',
            images: enrichedImages
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('Error sending to gallery tab:', chrome.runtime.lastError);
              // Store images and open gallery
              openGalleryWithImages(enrichedImages);
            } else {
              console.log('Successfully sent images to gallery tab:', response);
            }
          });
        } catch (err) {
          console.error('Error sending to gallery tab:', err);
          
          // Store images and open gallery
          openGalleryWithImages(enrichedImages);
        }
      } else {
        // Open gallery in a new tab with images
        openGalleryWithImages(enrichedImages);
      }
    });
    
    return true;
  } catch (err) {
    console.error('Error syncing images to gallery:', err);
    return false;
  }
}

function openGalleryWithImages(images) {
  // Create gallery tab with sync flag
  chrome.tabs.create({ url: 'https://main-gallery-hub.lovable.app/gallery?sync=true' });
  
  // Set up listener for when gallery tab is ready
  chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && 
        tab.url && tab.url.includes('main-gallery-hub.lovable.app/gallery')) {
      
      // Wait a bit to ensure the page is fully loaded and bridge script is injected
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, {
          type: 'GALLERY_IMAGES',
          images: images
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error sending images to new tab:', chrome.runtime.lastError);
          } else {
            console.log('Successfully sent images to new gallery tab:', response);
          }
        });
      }, 1500); // Increased delay to ensure page and bridge are ready
      
      chrome.tabs.onUpdated.removeListener(listener);
    }
  });
}
