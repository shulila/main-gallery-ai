
// Production URL for consistent redirects
const PRODUCTION_URL = 'https://main-gallery-hub.lovable.app';
const GALLERY_URL = `${PRODUCTION_URL}/gallery`;
const AUTH_URL = `${PRODUCTION_URL}/auth`;

// Auth utilities for Chrome extension without using localStorage
function isLoggedIn() {
  return new Promise((resolve) => {
    try {
      // Check for token in chrome.storage.sync with expiration validation
      chrome.storage.sync.get(['main_gallery_auth_token'], (result) => {
        const token = result.main_gallery_auth_token;
        
        if (token && token.access_token) {
          // Check if token has expiration and is still valid
          const hasExpiry = token.expires_at !== undefined;
          const isExpired = hasExpiry && Date.now() > token.expires_at;
          
          console.log('Token found, checking expiration:', 
                     hasExpiry ? `expires at ${new Date(token.expires_at).toISOString()}` : 'no expiry',
                     isExpired ? 'EXPIRED' : 'VALID');
          
          if (!isExpired) {
            // Token exists and is not expired
            resolve(true);
            return;
          } else {
            console.log('Token expired, will remove it');
            // Token exists but is expired, clean it up
            chrome.storage.sync.remove(['main_gallery_auth_token'], () => {
              resolve(false);
            });
            return;
          }
        }
        
        resolve(false);
      });
    } catch (err) {
      console.error('Error in isLoggedIn:', err);
      // If there's an error, consider the user not logged in
      resolve(false);
    }
  });
}

function openAuthPage(tabId = null, options = {}) {
  const authUrl = 'https://main-gallery-hub.lovable.app/auth';
  
  // Add any query parameters
  const searchParams = new URLSearchParams();
  if (options.redirect) searchParams.append('redirect', options.redirect);
  if (options.forgotPassword) searchParams.append('forgotPassword', 'true');
  if (options.signup) searchParams.append('signup', options.signup);
  if (options.from) searchParams.append('from', options.from);
  
  const queryString = searchParams.toString();
  const fullAuthUrl = queryString ? `${authUrl}?${queryString}` : authUrl;
  
  // Open the URL
  if (tabId) {
    chrome.tabs.update(tabId, { url: fullAuthUrl });
  } else {
    chrome.tabs.create({ url: fullAuthUrl });
  }
  
  console.log('Opened auth URL:', fullAuthUrl);
}

// Updated Google OAuth Client ID
const GOOGLE_CLIENT_ID = '648580197357-2v9sfcorca7060e4rdjr1904a4f1qa26.apps.googleusercontent.com';

// Get the production auth callback URL - NEVER use localhost
const getProductionRedirectUrl = () => {
  return 'https://main-gallery-hub.lovable.app/auth/callback';
};

function setupAuthCallbackListener() {
  try {
    console.log('Setting up auth callback listener');
    
    // Use tabs.onUpdated to detect auth callbacks
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      // Only process completed loads with our auth callback URL
      if (changeInfo.status === 'complete' && tab.url && 
          (tab.url.includes('main-gallery-hub.lovable.app/auth/callback') || 
           tab.url.includes('/auth?access_token='))) {
        
        console.log('Auth callback detected:', tab.url);
        
        // Get auth token from the URL - handle both hash and query params
        const url = new URL(tab.url);
        
        // Check for token in hash first (fragment identifier)
        const hashParams = new URLSearchParams(url.hash ? url.hash.substring(1) : '');
        const queryParams = new URLSearchParams(url.search);
        
        // Try to get token from both locations
        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
        const userEmail = hashParams.get('email') || queryParams.get('email');
        
        // If we have tokens, validate and store them
        if (accessToken) {
          console.log('Auth tokens detected, will store session');
          
          // Calculate token expiration (24 hours from now)
          const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
          
          // Store token info and user email for extension usage
          chrome.storage.sync.set({
            'main_gallery_auth_token': {
              access_token: accessToken,
              refresh_token: refreshToken,
              timestamp: Date.now(),
              expires_at: expiresAt
            },
            'main_gallery_user_email': userEmail || 'User'
          }, () => {
            console.log('Auth token and user info stored in extension storage with expiration');
            
            // Show success notification to let user know auth worked
            try {
              chrome.notifications.create('auth_success', {
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: 'Login Successful',
                message: 'You are now logged in to MainGallery'
              });
            } catch (err) {
              console.error('Error showing auth success notification:', err);
            }
            
            // Close the auth tab after successful login
            setTimeout(() => {
              chrome.tabs.remove(tabId);
              
              // Open gallery in a new tab
              chrome.tabs.create({ url: 'https://main-gallery-hub.lovable.app/gallery' });
              
              // Send message to update UI in popup if open
              try {
                chrome.runtime.sendMessage({ action: 'updateUI' }).catch(err => {
                  // This is expected if popup is not open
                  console.log('Could not send updateUI, popup may be closed');
                });
              } catch (err) {
                // This is expected if popup is not open
                console.log('Error sending updateUI message, popup may be closed');
              }
            }, 1000);
          });
        } else {
          console.error('Auth callback detected but no access token found');
          
          // Show error notification
          try {
            chrome.notifications.create('auth_error', {
              type: 'basic',
              iconUrl: 'icons/icon128.png',
              title: 'Login Failed',
              message: 'Unable to login. Please try again.'
            });
          } catch (err) {
            console.error('Error showing auth error notification:', err);
          }
        }
      }
    });
    
    console.log('Auth callback listener set up using tabs API');
  } catch (error) {
    console.error('Error setting up auth callback listener:', error);
  }
}

// Notification utility function
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

// Domain and path verification - make sure this matches manifest.json content_scripts
function checkSupportedURL(url) {
  if (!url) return false;
  
  // Skip chrome:// URLs and extension pages
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
    return false;
  }
  
  try {
    const urlObj = new URL(url);
    
    // Get supported domains and paths
    const SUPPORTED_DOMAINS = [
      'midjourney.com',
      'www.midjourney.com',
      'openai.com',
      'chat.openai.com',
      'labs.openai.com',
      'leonardo.ai',
      'www.leonardo.ai',
      'app.leonardo.ai',
      'runwayml.com',
      'www.runwayml.com',
      'runway.com',
      'pika.art',
      'www.pika.art',
      'beta.dreamstudio.ai',
      'dreamstudio.ai',
      'stability.ai',
      'playgroundai.com',
      'creator.nightcafe.studio'
    ];
    
    const SUPPORTED_PATHS = [
      '/imagine',
      '/archive',
      '/app',
      '/feed',
      '/gallery',
      '/create',
      '/generations',
      '/projects',
      '/dalle',
      '/playground',
      '/assets',
      '/workspace',
      '/dream',
      '/video'
    ];
    
    // Check if domain is supported
    const isDomainSupported = SUPPORTED_DOMAINS.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );
    
    // Check if path is supported
    const isPathSupported = SUPPORTED_PATHS.some(path => 
      urlObj.pathname === path || urlObj.pathname.startsWith(path)
    );
    
    // Special case for OpenAI dalleCreate path
    if (urlObj.hostname.includes('openai.com') && 
        (urlObj.pathname.includes('/image') || urlObj.pathname.includes('/dalle'))) {
      return true;
    }
    
    return isDomainSupported && isPathSupported;
  } catch (error) {
    console.error('Error parsing URL:', error);
    return false;
  }
}

// Initialize extension on load
console.log('MainGallery background script initializing...');
setupAuthCallbackListener();
console.log('Auth callback listener set up');

// Main action handler - triggered when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension icon clicked on tab:', tab.url);
  
  // Check if the URL is supported
  const isSupported = checkSupportedURL(tab.url);
  
  if (!isSupported) {
    console.log('Tab URL not supported, opening gallery instead');
    // Check if logged in first
    const loggedIn = await isLoggedIn();
    
    if (loggedIn) {
      // If logged in, open gallery
      chrome.tabs.create({ url: GALLERY_URL });
    } else {
      // If not logged in, open auth page
      openAuthPage(null, { redirect: 'gallery', from: 'extension' });
    }
    return;
  }
  
  // If URL is supported, check auth status
  const loggedIn = await isLoggedIn();
  
  if (!loggedIn) {
    console.log('User not logged in, redirecting to auth page');
    openAuthPage(null, { redirect: 'gallery', from: 'extension' });
    return;
  }
  
  console.log('User is logged in, extracting images from tab');
  
  // Authenticate first, then extract images
  try {
    const result = await extractImagesFromActiveTab();
    
    if (result.success && result.images.length > 0) {
      console.log(`Extracted ${result.images.length} images, syncing to gallery...`);
      
      // Sync extracted images to gallery
      await syncImagesToGallery(result.images);
    } else {
      console.log('No images extracted or extraction failed:', result.reason);
      
      // Show notification
      createNotification(
        'maingallery_extraction_failed', 
        'No AI Images Found', 
        'We couldn\'t find any AI-generated images on this page.'
      );
    }
  } catch (error) {
    console.error('Error during image extraction:', error);
    
    // Show error notification
    createNotification(
      'maingallery_error', 
      'Error Processing Images', 
      'An error occurred while extracting images from this page.'
    );
  }
});

// Set up message listeners for communication from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received in background script:', message);
  
  try {
    if (message.action === 'openAuthPage') {
      openAuthPage(null, message);
      sendResponse({ success: true });
    } else if (message.action === 'openAuthWithProvider') {
      // Implement provider-specific auth logic here
      sendResponse({ success: true });
    } else if (message.action === 'scanTabsEnhanced') {
      // Scan all tabs for images
      scanAllTabsForImages().then(result => {
        // Send results back to popup
        try {
          chrome.runtime.sendMessage({ 
            action: 'scanTabsResult',
            images: result.images,
            tabCount: result.tabCount
          }).catch(err => {
            console.log('Could not send scanTabsResult, popup may be closed');
          });
        } catch (err) {
          console.log('Error sending scanTabsResult, popup may be closed');
        }
      });
      sendResponse({ success: true });
    } else if (message.action === 'openGallery') {
      // Open gallery in a new tab
      chrome.tabs.create({ url: GALLERY_URL });
      sendResponse({ success: true });
    } else if (message.action === 'logout') {
      // Log out and clear storage
      chrome.storage.sync.remove(['main_gallery_auth_token', 'main_gallery_user_email'], () => {
        console.log('Logged out: cleared auth tokens');
        sendResponse({ success: true });
      });
      return true; // Required for async response
    } else if (message.type === 'SYNC_IMAGE') {
      console.log('Received image sync request:', message.payload);
      syncImageToGallery(message.payload).then(result => {
        sendResponse({ success: true, result });
      }).catch(err => {
        console.error('Error syncing image:', err);
        sendResponse({ success: false, error: err.message });
      });
      return true; // Required for async response
    }
  } catch (err) {
    console.error('Error handling message:', err);
    sendResponse({ success: false, error: err.message });
  }
});

// Implement image extraction and syncing
async function extractImagesFromActiveTab() {
  try {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs[0] || !tabs[0].id) {
          return resolve({ images: [], success: false, reason: 'no_active_tab' });
        }
        
        const tab = tabs[0];
        
        // Check if URL is supported
        if (!checkSupportedURL(tab.url)) {
          return resolve({ images: [], success: false, reason: 'unsupported_url' });
        }
        
        // Send message to content script to extract images
        try {
          chrome.tabs.sendMessage(tab.id, { action: 'extractImages' }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('Error sending message to content script:', chrome.runtime.lastError);
              return resolve({ images: [], success: false, reason: 'content_script_error' });
            }
            
            if (response && response.images) {
              resolve({ images: response.images, success: true });
            } else {
              resolve({ images: [], success: false, reason: 'no_images' });
            }
          });
        } catch (err) {
          console.error('Error sending extractImages message:', err);
          resolve({ images: [], success: false, reason: 'message_error' });
        }
      });
    });
  } catch (err) {
    console.error('Error extracting images:', err);
    return { images: [], success: false, reason: 'error', error: err.message };
  }
}

async function scanAllTabsForImages() {
  try {
    return new Promise((resolve) => {
      chrome.tabs.query({}, (tabs) => {
        const supportedTabs = tabs.filter(tab => checkSupportedURL(tab.url));
        const images = [];
        
        if (supportedTabs.length === 0) {
          return resolve({ images: [], tabCount: 0 });
        }
        
        let completedTabs = 0;
        
        for (const tab of supportedTabs) {
          try {
            chrome.tabs.sendMessage(tab.id, { action: 'extractImages' }, (response) => {
              completedTabs++;
              
              if (chrome.runtime.lastError) {
                console.log(`Error with tab ${tab.id}:`, chrome.runtime.lastError);
              } else if (response && response.images && response.images.length > 0) {
                images.push(...response.images);
              }
              
              if (completedTabs === supportedTabs.length) {
                resolve({ images, tabCount: supportedTabs.length });
              }
            });
          } catch (err) {
            console.error(`Error sending message to tab ${tab.id}:`, err);
            completedTabs++;
            
            if (completedTabs === supportedTabs.length) {
              resolve({ images, tabCount: supportedTabs.length });
            }
          }
        }
      });
    });
  } catch (err) {
    console.error('Error scanning tabs:', err);
    return { images: [], tabCount: 0, error: err.message };
  }
}

async function syncImageToGallery(imageData) {
  try {
    // Add metadata
    const enrichedData = {
      ...imageData,
      timestamp: imageData.timestamp || Date.now(),
      synced_at: Date.now()
    };
    
    // First, check if user is logged in
    const loggedIn = await isLoggedIn();
    
    if (!loggedIn) {
      console.log('User not logged in, storing image for later sync');
      
      // Store image data for later sync after login
      let pendingSync = [];
      try {
        const pendingSyncStr = sessionStorage.getItem('maingallery_pending_sync');
        if (pendingSyncStr) {
          pendingSync = JSON.parse(pendingSyncStr);
        }
      } catch (err) {
        console.error('Error parsing pending sync:', err);
      }
      
      pendingSync.push(enrichedData);
      sessionStorage.setItem('maingallery_pending_sync', JSON.stringify(pendingSync));
      
      // Redirect to login
      openAuthPage(null, { redirect: 'gallery', from: 'extension' });
      return { success: false, reason: 'not_logged_in' };
    }
    
    // If user is logged in, send to gallery using message bridge
    console.log('User is logged in, sending image to gallery');
    
    // Send to web app via bridge or open gallery with sync parameter
    chrome.tabs.query({ url: 'https://main-gallery-hub.lovable.app/gallery*' }, (tabs) => {
      if (tabs.length > 0) {
        // If gallery is open, send message
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'GALLERY_IMAGES',
          images: [enrichedData]
        }).catch(err => {
          console.log('Could not send to gallery tab, might open new one:', err.message);
          chrome.tabs.create({ url: 'https://main-gallery-hub.lovable.app/gallery?sync=true' });
        });
      } else {
        // Store in session storage and open gallery
        sessionStorage.setItem('maingallery_sync_images', JSON.stringify([enrichedData]));
        chrome.tabs.create({ url: 'https://main-gallery-hub.lovable.app/gallery?sync=true' });
      }
    });
    
    return { success: true };
  } catch (err) {
    console.error('Error syncing image to gallery:', err);
    return { success: false, error: err.message };
  }
}

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
          });
          
          createNotification(
            'maingallery_sync_success', 
            'Images Synced', 
            `${enrichedImages.length} images sent to your gallery`
          );
        } catch (err) {
          console.error('Error sending to gallery tab:', err);
          
          // Store images and open gallery
          sessionStorage.setItem('maingallery_sync_images', JSON.stringify(enrichedImages));
          chrome.tabs.create({ url: 'https://main-gallery-hub.lovable.app/gallery?sync=true' });
        }
      } else {
        // Store images and open gallery
        sessionStorage.setItem('maingallery_sync_images', JSON.stringify(enrichedImages));
        chrome.tabs.create({ url: 'https://main-gallery-hub.lovable.app/gallery?sync=true' });
      }
    });
    
    return true;
  } catch (err) {
    console.error('Error syncing images to gallery:', err);
    return false;
  }
}
