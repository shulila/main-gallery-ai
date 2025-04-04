// Auth utilities for Chrome extension
import { logger } from './logger.js';
import { handleError, safeFetch } from './errorHandler.js';

// Get the production auth callback URL - NEVER use localhost
const getProductionRedirectUrl = () => {
  // Use the production domain
  return 'https://main-gallery-hub.lovable.app/auth/callback';
};

// Get the auth URL with environment detection
const getAuthUrl = (options = {}) => {
  // Check if in preview environment
  if (typeof window !== 'undefined' && 
      window.location && 
      window.location.hostname && 
      window.location.hostname.includes('preview')) {
    return 'https://preview-main-gallery-ai.lovable.app/auth';
  }
  
  // Build URL with query params
  let url = 'https://main-gallery-hub.lovable.app/auth';
  
  // Add any provided options as query parameters
  if (options && Object.keys(options).length > 0) {
    const params = new URLSearchParams();
    
    for (const [key, value] of Object.entries(options)) {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    }
    
    const queryString = params.toString();
    if (queryString) {
      url += '?' + queryString;
    }
  }
  
  return url;
};

// Get the gallery URL with environment detection
const getGalleryUrl = () => {
  // Check if in preview environment
  if (typeof window !== 'undefined' && 
      window.location && 
      window.location.hostname && 
      window.location.hostname.includes('preview')) {
    return 'https://preview-main-gallery-ai.lovable.app/gallery';
  }
  
  // Default to production domain
  return 'https://main-gallery-hub.lovable.app/gallery';
};

// API endpoint for authentication
const getApiUrl = () => {
  // Check if in preview environment
  if (typeof window !== 'undefined' && 
      window.location && 
      window.location.hostname && 
      window.location.hostname.includes('preview')) {
    return 'https://preview-main-gallery-ai.lovable.app/api';
  }
  
  // Default to production domain
  return 'https://main-gallery-hub.lovable.app/api';
};

// Supported platforms for extension activation
const SUPPORTED_PLATFORMS = [
  'midjourney.com',
  'leonardo.ai',
  'openai.com',
  'dreamstudio.ai',
  'stability.ai',
  'runwayml.com',
  'pika.art',
  'discord.com/channels',
  'playgroundai.com',
  'creator.nightcafe.studio'
];

// Check if URL is supported for extension activation
function isSupportedPlatform(url) {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    return SUPPORTED_PLATFORMS.some(platform => urlObj.hostname.includes(platform) || 
      (platform.includes('discord.com') && urlObj.pathname.includes('midjourney')));
  } catch (e) {
    logger.error('Invalid URL:', url, e);
    return false;
  }
}

// Handle standard email/password login
async function handleEmailPasswordLogin(email, password) {
  try {
    logger.info('Attempting to log in with email and password');
    
    // Make API call to the backend for authentication
    const apiUrl = `${getApiUrl()}/auth/login`;
    logger.debug('Login API URL:', apiUrl);
    
    try {
      const response = await safeFetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      if (!response || !response.access_token) {
        throw new Error('No authentication token received');
      }
      
      // Store token info and user email for extension usage
      const tokenData = {
        access_token: response.access_token,
        refresh_token: response.refresh_token || '',
        email: email,
        timestamp: Date.now(),
        expires_at: Date.now() + (24 * 60 * 60 * 1000) // 24 hours expiry
      };
      
      // Store in Chrome storage
      chrome.storage.sync.set({
        'main_gallery_auth_token': tokenData,
        'main_gallery_user_email': email
      }, () => {
        logger.info('Auth token and user info stored in extension storage');
      });
      
      return {
        success: true,
        user: { email },
        token: response.access_token
      };
    } catch (fetchError) {
      // Check if this is an HTML response error
      if (fetchError.isHtmlError) {
        logger.error('Received HTML response instead of JSON during login');
        throw new Error("Invalid server response format. Please try again later.");
      }
      
      // Other fetch errors
      throw fetchError;
    }
  } catch (error) {
    logger.error('Email/password login error:', error);
    throw error;
  }
}

// Set up a listener for auth callback
function setupAuthCallbackListener() {
  try {
    logger.info('Setting up auth callback listener');
    
    // Use tabs.onUpdated to detect auth callbacks
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      // Only process completed loads with our auth callback URL
      if (changeInfo.status === 'complete' && tab.url && 
          (tab.url.includes('main-gallery-hub.lovable.app/auth/callback') || 
           tab.url.includes('/auth?access_token='))) {
        
        logger.info('Auth callback detected:', tab.url);
        
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
          logger.info('Auth tokens detected, will store session');
          
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
            logger.info('Auth token and user info stored in extension storage with expiration');
            
            // Show success notification
            try {
              chrome.notifications.create('auth_success', {
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: 'Login Successful',
                message: 'You are now logged in to MainGallery'
              });
            } catch (err) {
              handleError('showAuthSuccessNotification', err, { silent: true });
            }
            
            // Close the auth tab after successful login
            setTimeout(() => {
              chrome.tabs.remove(tabId);
              
              // Open gallery in a new tab
              chrome.tabs.create({ url: getGalleryUrl() });
              
              // Send message to update UI in popup if open
              chrome.runtime.sendMessage({ action: 'updateUI' });
            }, 1000);
          });
        } else {
          logger.error('Auth callback detected but no access token found');
          
          // Show error notification
          try {
            chrome.notifications.create('auth_error', {
              type: 'basic',
              iconUrl: 'icons/icon128.png',
              title: 'Login Failed',
              message: 'Unable to login. Please try again.'
            });
          } catch (err) {
            handleError('showAuthErrorNotification', err, { silent: true });
          }
        }
      }
    });
    
    logger.info('Auth callback listener set up using tabs API');
  } catch (error) {
    handleError('setupAuthCallbackListener', error);
  }
}

// Open auth page with improved environment detection
function openAuthPage(tabId = null, options = {}) {
  try {
    // Get the full auth URL with options
    const fullAuthUrl = getAuthUrl(options);
    
    // Log the URL we're opening for debugging
    logger.info('Opening auth URL:', fullAuthUrl);
    
    // Open the URL
    if (tabId) {
      chrome.tabs.update(tabId, { url: fullAuthUrl });
    } else {
      chrome.tabs.create({ url: fullAuthUrl });
    }
    
    logger.info('Opened auth URL:', fullAuthUrl);
  } catch (error) {
    handleError('openAuthPage', error);
    
    // Fallback to opening a simple URL if something went wrong
    try {
      if (tabId) {
        chrome.tabs.update(tabId, { url: getAuthUrl() });
      } else {
        chrome.tabs.create({ url: getAuthUrl() });
      }
    } catch (fallbackError) {
      handleError('openAuthPageFallback', fallbackError, { silent: true });
    }
  }
}

// Improved isLoggedIn to check expiration
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
          
          logger.debug('Token found, checking expiration:', 
                     hasExpiry ? `expires at ${new Date(token.expires_at).toISOString()}` : 'no expiry',
                     isExpired ? 'EXPIRED' : 'VALID');
          
          if (!isExpired) {
            // Token exists and is not expired
            resolve(true);
            return;
          } else {
            logger.info('Token expired, will remove it');
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
      handleError('isLoggedIn', err);
      // If there's an error, consider the user not logged in
      resolve(false);
    }
  });
}

// Get user email if available
function getUserEmail() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['main_gallery_user_email'], (result) => {
      resolve(result.main_gallery_user_email || null);
    });
  });
}

// Improved logout function with better error handling
function logout() {
  return new Promise((resolve, reject) => {
    try {
      logger.info('Processing logout request');
      
      // Get current token to check if we need to call API
      chrome.storage.sync.get(['main_gallery_auth_token'], async (result) => {
        const token = result.main_gallery_auth_token;
        
        // Try API logout only if we have a token
        if (token && token.access_token) {
          try {
            // Call the API to invalidate the token
            const apiUrl = `${getApiUrl()}/auth/logout`;
            await safeFetch(apiUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json',
              }
            }).catch(err => {
              // Log but continue even if API call fails
              logger.error('API logout failed:', err);
            });
          } catch (apiError) {
            // Log but continue with local logout even if API call fails
            logger.error('Error during API logout:', apiError);
          }
        }
        
        // Always clear extension storage regardless of API result
        chrome.storage.sync.remove(['main_gallery_auth_token', 'main_gallery_user_email'], () => {
          if (chrome.runtime.lastError) {
            logger.error('Error clearing storage during logout:', chrome.runtime.lastError);
          } else {
            logger.info('Successfully cleared auth data from storage');
          }
          
          // Also try to clear localStorage for web app integration
          try {
            if (window.localStorage) {
              window.localStorage.removeItem('access_token');
              window.localStorage.removeItem('main_gallery_auth_token');
              window.localStorage.removeItem('main_gallery_user_email');
              logger.info('Cleared localStorage items');
            }
          } catch (storageError) {
            logger.error('Error clearing localStorage:', storageError);
          }
          
          // Success regardless of API or localStorage results
          resolve(true);
        });
      });
    } catch (error) {
      handleError('logout', error);
      
      // Attempt emergency cleanup as fallback
      try {
        chrome.storage.sync.remove(['main_gallery_auth_token', 'main_gallery_user_email'], () => {
          logger.info('Emergency storage cleanup during logout error');
          resolve(true); // Consider it a success if we at least cleared storage
        });
      } catch (emergencyError) {
        reject(new Error('Failed to logout: ' + (error.message || 'Unknown error')));
      }
    }
  });
}

// Export functions
export { 
  handleEmailPasswordLogin, 
  setupAuthCallbackListener, 
  openAuthPage, 
  isLoggedIn, 
  getUserEmail, 
  logout, 
  isSupportedPlatform, 
  getAuthUrl, 
  getGalleryUrl, 
  getProductionRedirectUrl 
};
