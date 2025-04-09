
// Auth utilities for Chrome extension
import { logger } from './logger.js';
import { handleError, safeFetch } from './errorHandler.js';
import { isPreviewEnvironment, getBaseUrl, getAuthUrl as getEnvironmentAuthUrl } from './urlUtils.js';
import { supabase } from './supabaseClient.js';

// Extension ID - important for OAuth flow
const EXTENSION_ID = chrome.runtime.id || 'oapmlmnmepbgiafhbbkjbkbppfdclknlb';

// Use the correct OAuth client ID for MainGalleryAI
const GOOGLE_CLIENT_ID = '648580197357-2v9sfcorca7060e4rdjr1904a4f1qa26.apps.googleusercontent.com';

// Get the production auth callback URL
const getProductionRedirectUrl = () => {
  return 'https://main-gallery-ai.lovable.app/auth/callback';
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

// Get Google OAuth client ID
const getGoogleClientId = () => {
  // Always use the correct client ID for MainGalleryAI OAuth flow
  return GOOGLE_CLIENT_ID;
};

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

// Enhanced Google OAuth login for in-popup authentication
async function handleInPopupGoogleLogin() {
  try {
    logger.info('Starting in-popup Google login flow with chrome.identity');
    
    // Use the correct client ID for MainGalleryAI
    const clientId = getGoogleClientId();
    const redirectURL = getExtensionRedirectUrl(); // Use extension callback URL
    
    logger.info('Using OAuth client ID:', clientId);
    logger.info('Using extension redirect URL:', redirectURL);
    
    // Build the OAuth URL with proper scopes for Chrome extension
    const nonce = Math.random().toString(36).substring(2, 15);
    
    const authParams = new URLSearchParams({
      client_id: clientId,
      response_type: 'token',
      redirect_uri: redirectURL,
      scope: 'email profile openid',
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
            
            // Store token info and user email for extension usage in both sync and local storage
            const tokenData = {
              access_token: accessToken,
              id_token: idToken,
              token_type: hashParams.get('token_type') || 'Bearer',
              timestamp: Date.now(),
              expires_at: expiresAt
            };
            
            // Set up Supabase session with the token to enable API access
            try {
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: '' // Google OAuth doesn't provide refresh token in this flow
              });
              
              if (error) {
                logger.error('Error setting Supabase session:', error);
                // Continue anyway as we'll store the token in extension storage
              } else {
                logger.info('Successfully set Supabase session');
              }
            } catch (err) {
              logger.error('Error calling Supabase setSession:', err);
              // Continue anyway as we'll store the token in extension storage
            }
            
            // Store data in chrome.storage.sync
            chrome.storage.sync.set({
              'main_gallery_auth_token': tokenData,
              'main_gallery_user_email': userEmail || 'User',
              'main_gallery_user_name': userName
            });
            
            // Also store in chrome.storage.local for background script access
            chrome.storage.local.set({
              'main_gallery_auth_token': tokenData,
              'main_gallery_user_email': userEmail || 'User',
              'main_gallery_user_name': userName
            });
            
            logger.info('Auth tokens and user info stored successfully');
            
            resolve({
              success: true,
              user: { 
                email: userEmail,
                name: userName
              },
              token: accessToken
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

// Improved email/password login with error handling
async function handleEmailPasswordLogin(email, password) {
  logger.info('Email/password login requested for:', email);
  
  try {
    if (!email || !password) {
      return {
        success: false,
        error: 'Email and password are required'
      };
    }
    
    // Use Supabase directly for email/password authentication
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });
    
    if (error) {
      logger.error('Supabase login error:', error);
      
      // Handle specific error cases
      let errorMessage = error.message;
      if (error.message.includes('credentials')) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (error.message.includes('confirmed')) {
        errorMessage = 'Please confirm your email address before logging in.';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
    
    if (!data.session) {
      logger.error('Login succeeded but no session returned');
      return {
        success: false,
        error: 'Authentication successful but session creation failed.'
      };
    }
    
    // Store token info and user email for extension usage
    const tokenData = {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      timestamp: Date.now(),
      expires_at: data.session.expires_at * 1000 // Supabase returns seconds, convert to ms
    };
    
    // Store data in chrome.storage.sync
    chrome.storage.sync.set({
      'main_gallery_auth_token': tokenData,
      'main_gallery_user_email': data.user?.email || email
    });
    
    // Also store in chrome.storage.local for background script access
    chrome.storage.local.set({
      'main_gallery_auth_token': tokenData,
      'main_gallery_user_email': data.user?.email || email
    });
    
    logger.info('Login successful for:', email);
    
    return {
      success: true,
      user: data.user,
      session: data.session
    };
  } catch (error) {
    logger.error('Error in handleEmailPasswordLogin:', error);
    return {
      success: false,
      error: 'An unexpected error occurred during login. Please try again.'
    };
  }
}

// Improved isLoggedIn to check expiration and validate token
function isLoggedIn() {
  return new Promise((resolve) => {
    try {
      // Check for token in chrome.storage.sync with expiration validation
      chrome.storage.sync.get(['main_gallery_auth_token'], async (result) => {
        const token = result.main_gallery_auth_token;
        
        if (token && token.access_token) {
          // Check if token has expiration and is still valid
          const hasExpiry = token.expires_at !== undefined;
          const isExpired = hasExpiry && Date.now() > token.expires_at;
          
          logger.debug('Token found, checking expiration:', 
                     hasExpiry ? `expires at ${new Date(token.expires_at).toISOString()}` : 'no expiry',
                     isExpired ? 'EXPIRED' : 'VALID');
          
          if (!isExpired) {
            // Token exists and is not expired, validate with Supabase
            try {
              // Set the session in Supabase to validate
              const { data, error } = await supabase.auth.setSession({
                access_token: token.access_token,
                refresh_token: token.refresh_token || ''
              });
              
              if (error) {
                logger.error('Supabase session validation failed:', error);
                
                // Clear invalid tokens and resolve as not logged in
                clearAuthStorage(() => {
                  resolve(false);
                });
                return;
              }
              
              // Get user to verify session is valid
              const { data: userData, error: userError } = await supabase.auth.getUser();
              
              if (userError || !userData.user) {
                logger.error('Failed to validate user with token:', userError);
                
                // Clear invalid tokens and resolve as not logged in
                clearAuthStorage(() => {
                  resolve(false);
                });
                return;
              }
              
              // Token is valid and user exists
              logger.info('Token validated successfully with Supabase');
              resolve(true);
              return;
            } catch (validationError) {
              logger.error('Error validating token with Supabase:', validationError);
              
              // Clear tokens that fail validation
              clearAuthStorage(() => {
                resolve(false);
              });
              return;
            }
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
            // Sign out from Supabase
            const { error } = await supabase.auth.signOut();
            
            if (error) {
              logger.error('Supabase signOut error:', error);
            } else {
              logger.info('Successfully signed out from Supabase');
            }
          } catch (apiError) {
            // Log but continue with local logout even if API call fails
            logger.error('Error during Supabase signOut:', apiError);
          }
        }
        
        // Always clear extension storage regardless of API result
        clearAuthStorage(() => {
          logger.info('Successfully cleared auth data during logout');
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

// Export functions
export { 
  handleInPopupGoogleLogin, 
  handleEmailPasswordLogin,
  isLoggedIn, 
  getUserEmail, 
  logout,
  clearAuthStorage,
  getAuthUrl, 
  getGalleryUrl, 
  getProductionRedirectUrl,
  getExtensionRedirectUrl,
  getGoogleClientId
};
