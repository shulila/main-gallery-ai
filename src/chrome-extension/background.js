
// Import functions from other modules - avoid dynamic imports in MV3
// Use standard JS function declarations and move code from imported files

// Authentication utilities
function setupAuthCallbackListener() {
  try {
    // Use tabs.onUpdated to detect auth callbacks
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      // Only process completed loads with our auth callback URL
      if (changeInfo.status === 'complete' && tab.url && 
          tab.url.includes('main-gallery-hub.lovable.app/auth/callback')) {
        
        console.log('Auth navigation detected:', tab.url);
        
        // Get auth token from the URL
        const url = new URL(tab.url);
        const accessToken = url.hash ? new URLSearchParams(url.hash.substring(1)).get('access_token') : null;
        const refreshToken = url.hash ? new URLSearchParams(url.hash.substring(1)).get('refresh_token') : null;
        const userEmail = url.hash ? new URLSearchParams(url.hash.substring(1)).get('email') : null;
        
        // If we have tokens, validate and store them
        if (accessToken) {
          console.log('Auth tokens detected, will store session');
          
          // Store basic token info for extension usage
          chrome.storage.sync.set({
            'main_gallery_auth_token': {
              access_token: accessToken,
              refresh_token: refreshToken,
              timestamp: Date.now()
            },
            'main_gallery_user_email': userEmail || 'User'
          }, () => {
            console.log('Auth token stored in extension storage');
            
            // Also try to store in localStorage for web access
            try {
              const mainWindow = chrome.extension.getBackgroundPage();
              if (mainWindow && mainWindow.localStorage) {
                mainWindow.localStorage.setItem('main_gallery_auth_token', JSON.stringify({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                  timestamp: Date.now()
                }));
                mainWindow.localStorage.setItem('main_gallery_user_email', userEmail || 'User');
              }
            } catch (err) {
              console.error('Error setting localStorage from background:', err);
            }
            
            // Close the auth tab after successful login
            setTimeout(() => {
              chrome.tabs.remove(tabId);
              
              // Open gallery in a new tab
              chrome.tabs.create({ url: 'https://main-gallery-hub.lovable.app/gallery' });
              
              // Send message to update UI if popup is open
              chrome.runtime.sendMessage({ action: 'updateUI' });
            }, 1000);
          });
        }
      }
    });
    
    console.log('Auth callback listener set up using tabs API');
  } catch (error) {
    console.error('Error setting up auth callback listener:', error);
  }
}

// Open auth page
function openAuthPage(tabId = null, options = {}) {
  let authUrl = 'https://main-gallery-hub.lovable.app/auth';
  
  // Add any query parameters
  const searchParams = new URLSearchParams();
  if (options.redirect) searchParams.append('redirect', options.redirect);
  if (options.forgotPassword) searchParams.append('forgotPassword', 'true');
  if (options.signup) searchParams.append('signup', 'true');
  if (options.from) searchParams.append('from', options.from);
  
  const queryString = searchParams.toString();
  if (queryString) {
    authUrl += `?${queryString}`;
  }
  
  // Open the URL
  if (tabId) {
    chrome.tabs.update(tabId, { url: authUrl });
  } else {
    chrome.tabs.create({ url: authUrl });
  }
  
  console.log('Opened auth URL:', authUrl);
}

// Handle OAuth sign-in with provider
function openAuthWithProvider(provider) {
  try {
    // For Google sign-in, we'll use a direct approach
    const redirectUrl = 'https://main-gallery-hub.lovable.app/auth/callback';
    console.log(`Opening ${provider} auth with redirect to:`, redirectUrl);
    
    // Generate a state param for security
    const stateParam = Math.random().toString(36).substring(2, 15);
    
    // Store this state param for verification later
    chrome.storage.local.set({ 'oauth_state': stateParam });
    
    // Updated Google OAuth client ID
    const GOOGLE_CLIENT_ID = '648580197357-2v9sfcorca7060e4rdjr1904a4f1qa26.apps.googleusercontent.com';
    
    if (provider === 'google') {
      // Construct the Google OAuth URL directly
      const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUrl)}&response_type=token&scope=email%20profile&prompt=select_account&include_granted_scopes=true&state=${stateParam}`;
      
      // Log the URL for debugging
      console.log(`Constructed Google OAuth URL:`, googleOAuthUrl);
      
      // Open the OAuth URL in a new tab
      chrome.tabs.create({ url: googleOAuthUrl });
      
      console.log(`Opened ${provider} OAuth URL manually:`, googleOAuthUrl);
    } else {
      console.error(`Provider ${provider} not supported in direct mode`);
    }
  } catch (error) {
    console.error(`Error during ${provider} auth:`, error);
  }
}

// Check if user is logged in - improved to check both extension storage and localStorage
function isLoggedIn() {
  return new Promise((resolve) => {
    // Check if token exists in extension storage
    chrome.storage.sync.get(['main_gallery_auth_token'], (result) => {
      if (result.main_gallery_auth_token) {
        resolve(true);
      } else {
        // If no token in extension storage, resolve false
        resolve(false);
      }
    });
  });
}

// Log out from all platforms
function logout() {
  try {
    // Clear local storage token
    return new Promise((resolve) => {
      chrome.storage.sync.remove(['main_gallery_auth_token', 'main_gallery_user_email'], () => {
        console.log('Successfully logged out');
        resolve(true);
      });
    });
  } catch (error) {
    console.error('Logout error:', error);
    return Promise.resolve(false);
  }
}

// Platform detection utility
function debugPlatformDetection(url) {
  if (!url) return null;
  
  if (url.includes('midjourney.com')) {
    return 'midjourney';
  } else if (url.includes('openai.com')) {
    return 'dalle';
  } else if (url.includes('dreamstudio.ai') || url.includes('stability.ai')) {
    return 'stableDiffusion';
  } else if (url.includes('runwayml.com')) {
    return 'runway';
  } else if (url.includes('pika.art')) {
    return 'pika';
  } else if (url.includes('leonardo.ai')) {
    return 'leonardo';
  } else if (url.includes('discord.com/channels') && url.includes('midjourney')) {
    return 'midjourney';
  }
  
  return null;
}

// Set up auth callback listener - using tabs API
console.log('Setting up auth callback listener');
setupAuthCallbackListener();

// Production URL for consistent redirects
const PRODUCTION_URL = 'https://main-gallery-hub.lovable.app';

// Listen for extension installation/update
chrome.runtime.onInstalled.addListener(function(details) {
  console.log('Extension installed or updated:', details.reason);
  
  // Show a notification to pin the extension on install
  if (details.reason === 'install') {
    try {
      console.log('Extension installed, creating welcome notification');
      
      // Create a unique ID for this notification
      const notificationId = 'installation-' + Date.now();
      
      // Use chrome notifications API
      chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Welcome to MainGallery.AI',
        message: 'Pin this extension for quick access to your AI art gallery!'
      });
    } catch (error) {
      console.error('Failed to show installation notification:', error);
    }
  }
});

// Listen for tab updates to detect supported platforms
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const platformId = debugPlatformDetection(tab.url);
    
    if (platformId) {
      console.log(`MainGallery: Detected ${platformId} on tab ${tabId}`);
      
      // Special handling for Midjourney app page for image extraction
      if (platformId === 'midjourney' && tab.url.includes('midjourney.com/app')) {
        console.log('Detected Midjourney app page, will check login status');
        
        // Check if user is logged in to MainGallery
        isLoggedIn().then(loggedIn => {
          if (loggedIn) {
            console.log('User logged in, will trigger image extraction');
            // Trigger image extraction in content script
            chrome.tabs.sendMessage(tabId, { 
              action: 'extractMidjourneyImages'
            }).catch(err => {
              console.log('Content script may not be ready yet:', err.message);
              
              // Retry after a delay
              setTimeout(() => {
                chrome.tabs.sendMessage(tabId, { 
                  action: 'extractMidjourneyImages'
                }).catch(err => {
                  console.log('Content script still not ready:', err.message);
                });
              }, 3000);
            });
          }
        });
      }
      
      // Regular platform detection logic
      isLoggedIn().then(loggedIn => {
        // Notify the content script that we've detected a supported platform
        chrome.tabs.sendMessage(tabId, { 
          action: 'platformDetected',
          platformId: platformId,
          userLoggedIn: loggedIn
        }).catch(err => {
          console.log('Content script may not be ready yet:', err.message);
        });
      });
    }
  }
});

// Handle icon click in toolbar
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension icon clicked in toolbar');
  
  // Check if user is logged in to MainGallery
  const loggedIn = await isLoggedIn();
  
  if (loggedIn) {
    // If user is logged in, go directly to gallery
    console.log('User is logged in, opening gallery directly');
    openGallery();
    return;
  }
  
  // User is not logged in, open auth page
  console.log('User not logged in, opening auth page');
  openAuthPage();
});

// Function to open the gallery
function openGallery() {
  const galleryUrl = `${PRODUCTION_URL}/gallery`;
  console.log('Opening gallery at', galleryUrl);
  
  // Check if gallery tab is already open
  chrome.tabs.query({ url: `${galleryUrl}*` }, (tabs) => {
    if (tabs && tabs.length > 0) {
      // Gallery tab exists, focus it
      chrome.tabs.update(tabs[0].id, { active: true });
    } else {
      // Gallery tab doesn't exist, open a new one
      chrome.tabs.create({ url: galleryUrl });
    }
  });
}

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log('Received message:', message.action, 'from:', sender.tab?.url || 'popup');
  
  switch (message.action) {
    case 'openGallery':
      openGallery();
      sendResponse({ success: true });
      break;
      
    case 'openAuthPage':
      openAuthPage(null, { forgotPassword: message.forgotPassword, from: message.from });
      sendResponse({ success: true });
      break;
      
    case 'openAuthWithProvider':
      openAuthWithProvider(message.provider);
      sendResponse({ success: true });
      break;
      
    case 'checkLoginStatus':
      isLoggedIn().then(loggedIn => {
        sendResponse({ isLoggedIn: loggedIn });
      });
      return true; // Will respond asynchronously
      
    case 'logout':
      logout().then(() => {
        sendResponse({ success: true });
      });
      return true; // Will respond asynchronously
      
    // Midjourney API Test Handlers
    case 'testMidjourneyAuth':
      // For POC we use locally stored data rather than a direct API connection
      chrome.storage.local.get(['midjourney_extracted_images'], function(result) {
        const images = result.midjourney_extracted_images || [];
        
        sendResponse({
          success: true,
          authenticated: true,
          extractionEnabled: true,
          imageCount: images.length,
          lastExtraction: images.length > 0 ? images[0].extractedAt : null
        });
      });
      return true; // Will respond asynchronously
      
    case 'testMidjourneyImages':
      // Get images from storage for our POC
      chrome.storage.local.get(['midjourney_extracted_images'], function(result) {
        const images = result.midjourney_extracted_images || [];
        
        // Limit to the most recent 5 images for display
        const recentImages = images.slice(0, 5);
        
        sendResponse({
          success: true,
          totalImages: images.length,
          displayedImages: recentImages.length,
          images: recentImages
        });
      });
      return true; // Will respond asynchronously
      
    case 'testMidjourneyGenerate':
      // Mock generation job for the POC
      const jobId = `mj-job-${Date.now()}`;
      
      // Store this job in local storage
      chrome.storage.local.get(['midjourney_jobs'], function(result) {
        const jobs = result.midjourney_jobs || [];
        
        jobs.unshift({
          jobId,
          prompt: message.prompt || "Futuristic cityscape with neon lights and flying cars",
          status: "queued",
          createdAt: new Date().toISOString()
        });
        
        chrome.storage.local.set({
          'midjourney_jobs': jobs
        }, () => {
          sendResponse({
            success: true,
            jobId: jobId,
            prompt: message.prompt,
            status: "queued"
          });
        });
      });
      return true; // Will respond asynchronously
      
    case 'testMidjourneyJobStatus':
      // Get job status from storage for our POC
      chrome.storage.local.get(['midjourney_jobs'], function(result) {
        const jobs = result.midjourney_jobs || [];
        const job = jobs.find(j => j.jobId === message.jobId);
        
        if (job) {
          // If job was queued, mark it as completed now for the demo
          if (job.status === "queued") {
            job.status = "completed";
            job.completedAt = new Date().toISOString();
            job.imageUrl = "https://picsum.photos/512/512?random=4";
            
            // Update job in storage
            chrome.storage.local.set({
              'midjourney_jobs': jobs.map(j => j.jobId === job.jobId ? job : j)
            });
          }
          
          sendResponse({
            success: true,
            jobId: job.jobId,
            status: job.status,
            progress: 100,
            url: job.imageUrl || "https://picsum.photos/512/512?random=4",
            originalPrompt: job.prompt
          });
        } else {
          // Job not found, create a mock response
          sendResponse({
            success: false,
            error: "Job not found",
            jobId: message.jobId
          });
        }
      });
      return true; // Will respond asynchronously
      
    case 'midjourneyImagesExtracted':
      // Forward this message to the popup if it's open
      chrome.runtime.sendMessage({
        action: 'midjourneyImagesExtracted',
        count: message.count
      });
      sendResponse({ success: true });
      break;
  }
  
  // Return true if we plan to respond asynchronously
  return true;
});

// Store extracted images from content script
chrome.runtime.onMessage.addListener(function(message, sender) {
  if (message.action === 'storeExtractedImages' && message.images) {
    console.log(`Received ${message.images.length} images for storage from tab:`, sender.tab.id);
    
    // Store in chrome.storage.local
    chrome.storage.local.get(['midjourney_extracted_images'], function(result) {
      const existingImages = result.midjourney_extracted_images || [];
      const existingIds = new Set(existingImages.map(img => img.id));
      
      // Filter out duplicates
      const newImages = message.images.filter(img => !existingIds.has(img.id));
      
      // Combine and store (keep most recent at the start)
      const combinedImages = [...newImages, ...existingImages];
      
      // Store in chrome.storage.local
      chrome.storage.local.set({
        'midjourney_extracted_images': combinedImages
      }, function() {
        console.log(`Stored ${newImages.length} new images (${combinedImages.length} total)`);
      });
    });
  }
});
