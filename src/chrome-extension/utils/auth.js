
// Auth utilities for Chrome extension
import { logger } from './logger.js';
import { handleError, safeFetch } from './errorHandler.js';
import { isPreviewEnvironment, getBaseUrl, getAuthUrl as getEnvironmentAuthUrl } from './urlUtils.js';

// Extension ID - important for OAuth flow
const EXTENSION_ID = chrome.runtime.id || 'oapmlmnmepbgiafhbbkjbkbppfdclknlb';

// ALWAYS use the Preview OAuth client ID for Chrome extensions to avoid invalid_client errors
const GOOGLE_CLIENT_ID = '288496481194-vj3uii1l1hp8c18sf7jr7s7dt1qcamom.apps.googleusercontent.com';

// Get the production auth callback URL - NEVER use localhost
const getProductionRedirectUrl = () => {
  // Use the production domain
  return 'https://main-gallery-hub.lovable.app/auth/callback';
};

// Get the preview auth callback URL
const getPreviewRedirectUrl = () => {
  // Use the preview domain
  return 'https://preview-main-gallery-ai.lovable.app/auth/callback';
};

// Get Chrome extension redirect URL for OAuth
const getExtensionRedirectUrl = () => {
  return chrome.identity.getRedirectURL();
};

// Get the auth URL with environment detection
const getAuthUrl = (options = {}) => {
  return getEnvironmentAuthUrl(options);
};

// Get the gallery URL with environment detection
const getGalleryUrl = () => {
  return `${getBaseUrl()}/gallery`;
};

// API endpoint for authentication
const getApiUrl = () => {
  return `${getBaseUrl()}/api`;
};

// Get Google OAuth client ID - FIXED to always use Preview client ID
const getGoogleClientId = () => {
  // Always use the Preview client ID for extension OAuth flow
  return GOOGLE_CLIENT_ID;
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
    // Add additional debugging
    console.log(`MainGallery: Checking if platform is supported: ${urlObj.hostname}`);
    return SUPPORTED_PLATFORMS.some(platform => urlObj.hostname.includes(platform) || 
      (platform.includes('discord.com') && urlObj.pathname.includes('midjourney')));
  } catch (e) {
    logger.error('Invalid URL:', url, e);
    return false;
  }
}

// Clean up all storage data related to authentication
function clearAuthStorage(callback = () => {}) {
  logger.info('Clearing all auth-related storage');
  
  try {
    // Create a batch of operations to ensure we clean everything
    const storageKeys = [
      'main_gallery_auth_token',
      'main_gallery_user_email',
      'main_gallery_user_name'
    ];
    
    // Clear both sync and local storage
    if (chrome.storage?.sync) {
      chrome.storage.sync.remove(storageKeys, () => {
        logger.info('Sync storage cleared');
        
        // Also try local storage
        if (chrome.storage?.local) {
          chrome.storage.local.remove(storageKeys, () => {
            logger.info('Local storage cleared');
            callback();
          });
        } else {
          callback();
        }
      });
    } else if (chrome.storage?.local) {
      // If no sync storage, try just local
      chrome.storage.local.remove(storageKeys, () => {
        logger.info('Local storage cleared');
        callback();
      });
    } else {
      // No storage APIs available
      callback();
    }
    
    // Also clear localStorage if available (e.g., in popup context)
    try {
      // Check if we're in a window context before accessing localStorage
      if (typeof self !== 'undefined' && self.localStorage) {
        self.localStorage.removeItem('access_token');
        self.localStorage.removeItem('id_token');
        self.localStorage.removeItem('main_gallery_auth_token');
        self.localStorage.removeItem('main_gallery_user_email');
        self.localStorage.removeItem('main_gallery_user_name');
        logger.info('localStorage cleared');
      }
    } catch (err) {
      logger.error('Error clearing localStorage (this is normal in service worker):', err);
    }
  } catch (err) {
    logger.error('Error clearing auth storage:', err);
    callback();
  }
}

// Handle in-popup Google OAuth login using chrome.identity
async function handleInPopupGoogleLogin() {
  try {
    logger.info('Starting in-popup Google login flow with chrome.identity');
    
    // Use the fixed Preview client ID
    const clientId = getGoogleClientId();
    const redirectURL = getExtensionRedirectUrl();
    
    logger.info('Using OAuth client ID:', clientId);
    logger.info('Using redirect URL:', redirectURL);
    
    // Build the OAuth URL with proper scopes for Chrome extension
    const nonce = Math.random().toString(36).substring(2, 15);
    
    const authParams = new URLSearchParams({
      client_id: clientId,
      response_type: 'token id_token',
      redirect_uri: redirectURL,
      scope: 'openid email profile',
      nonce: nonce,
      prompt: 'select_account',
    });
    
    const authURL = `https://accounts.google.com/o/oauth2/auth?${authParams.toString()}`;
    
    logger.info('Auth URL for chrome.identity:', authURL);
    
    // Launch the identity flow and return a promise
    return new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        { 
          url: authURL, 
          interactive: true
        },
        async (responseUrl) => {
          if (chrome.runtime.lastError) {
            logger.error('Auth Error:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          if (!responseUrl) {
            logger.error('Auth response URL is empty or undefined');
            reject(new Error('No response received from authentication'));
            return;
          }
          
          logger.info('Auth response URL received');
          
          try {
            // Parse the response URL
            const url = new URL(responseUrl);
            
            // Get tokens from hash fragment
            const hashParams = new URLSearchParams(url.hash.substring(1));
            
            // Extract tokens and user info
            const accessToken = hashParams.get('access_token');
            const idToken = hashParams.get('id_token');
            
            if (!accessToken) {
              throw new Error('No access token received');
            }
            
            // Get user info from id_token or fetch it with the access token
            let userEmail = null;
            let userName = null;
            
            if (idToken) {
              // Parse the JWT to get user info
              const payload = JSON.parse(atob(idToken.split('.')[1]));
              userEmail = payload.email;
              userName = payload.name;
              logger.info('User info from ID token:', { email: userEmail, name: userName });
            } else {
              // Use access token to fetch user info
              const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` }
              });
              
              if (userInfoResponse.ok) {
                const userInfo = await userInfoResponse.json();
                userEmail = userInfo.email;
                userName = userInfo.name;
                logger.info('User info from userinfo endpoint:', userInfo);
              } else {
                logger.error('Failed to fetch user info:', await userInfoResponse.text());
              }
            }
            
            // Calculate token expiration
            const expiresIn = parseInt(hashParams.get('expires_in') || '3600', 10);
            const expiresAt = Date.now() + (expiresIn * 1000);
            
            // Store token info and user email for extension usage
            chrome.storage.sync.set({
              'main_gallery_auth_token': {
                access_token: accessToken,
                id_token: idToken,
                token_type: hashParams.get('token_type') || 'Bearer',
                timestamp: Date.now(),
                expires_at: expiresAt
              },
              'main_gallery_user_email': userEmail || 'User',
              'main_gallery_user_name': userName
            }, () => {
              logger.info('Auth tokens and user info stored successfully');
              
              resolve({
                success: true,
                user: { 
                  email: userEmail,
                  name: userName
                },
                token: accessToken
              });
            });
          } catch (parseError) {
            logger.error('Error parsing auth response:', parseError);
            reject(parseError);
          }
        }
      );
    });
  } catch (error) {
    logger.error('Error initiating in-popup Google login:', error);
    throw error;
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
      const fallbackUrl = isPreviewEnvironment() 
        ? 'https://preview-main-gallery-ai.lovable.app/auth' 
        : 'https://main-gallery-hub.lovable.app/auth';
        
      if (tabId) {
        chrome.tabs.update(tabId, { url: fallbackUrl });
      } else {
        chrome.tabs.create({ url: fallbackUrl });
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
            clearAuthStorage(() => {
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
  return new Promise((resolve) => {
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
              },
              // Add timeout to prevent hanging
              maxRetries: 0, // Don't retry logout
              signal: AbortSignal.timeout(5000) // 5 second timeout
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
        clearAuthStorage(() => {
          logger.info('Successfully cleared auth data during logout');
          
          // Redirect to login page after logout if needed
          try {
            if (options?.redirect) {
              chrome.tabs.create({ url: getAuthUrl() });
              logger.info('Redirected to login page after logout');
            }
          } catch (redirectError) {
            logger.error('Failed to redirect after logout:', redirectError);
          }
          
          resolve(true);
        });
      });
    } catch (error) {
      handleError('logout', error);
      
      // Attempt emergency cleanup as fallback
      clearAuthStorage(() => {
        logger.info('Emergency storage cleanup during logout error');
        resolve(true); // Consider it a success if we at least cleared storage
      });
    }
  });
}

// Setup auth callback listener
function setupAuthCallbackListener() {
  try {
    logger.info('Setting up auth callback listener');
    
    // Use tabs.onUpdated to detect auth callbacks
    if (chrome.tabs && chrome.tabs.onUpdated) {
      chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        // Only process completed loads with our auth callback URL
        if (changeInfo.status === 'complete' && tab.url && 
            (tab.url.includes('main-gallery-hub.lovable.app/auth/callback') || 
             tab.url.includes('preview-main-gallery-ai.lovable.app/auth/callback') ||
             tab.url.includes('/auth?access_token='))) {
          
          logger.info('Auth callback detected:', tab.url);
          
          // Process the callback and update extension state
          try {
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
              
              // Send error message to popup if open
              chrome.runtime.sendMessage({ 
                action: 'authError', 
                error: 'Authentication failed. No access token received.' 
              });
            }
          } catch (e) {
            logger.error('Error processing auth callback:', e);
          }
        }
      });
      
      logger.info('Auth callback listener set up using tabs API');
    } else {
      logger.error('Chrome tabs API not available, cannot set up auth callback listener');
    }
  } catch (error) {
    handleError('setupAuthCallbackListener', error);
  }
}

// Export functions
export { 
  handleInPopupGoogleLogin, 
  setupAuthCallbackListener, 
  openAuthPage, 
  isLoggedIn, 
  getUserEmail, 
  logout,
  clearAuthStorage,
  isSupportedPlatform, 
  getAuthUrl, 
  getGalleryUrl, 
  getProductionRedirectUrl,
  getPreviewRedirectUrl,
  getExtensionRedirectUrl,
  getGoogleClientId
};
