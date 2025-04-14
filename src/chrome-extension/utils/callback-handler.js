
/**
 * Callback handler for Google OAuth authentication
 * This module handles the callback URL with access_token from Google OAuth
 */

import { logger } from './logger.js';
import { storage, STORAGE_KEYS } from './storage.js';

/**
 * Check if the current URL is a callback URL with access_token
 * @param {string} url - URL to check
 * @returns {boolean} - Whether the URL is a callback URL
 */
export function isCallbackUrl(url) {
  try {
    if (!url) return false;
    
    // Check if URL contains access_token
    return url.includes('access_token=') && 
           (url.includes('/auth/callback') || url.includes('/oauth/callback'));
  } catch (error) {
    logger.error('Error checking callback URL:', error);
    return false;
  }
}

/**
 * Extract access token from callback URL
 * @param {string} url - Callback URL
 * @returns {Object|null} - Token data or null if invalid
 */
export function extractTokenFromUrl(url) {
  try {
    if (!url) return null;
    
    // Parse the URL
    const urlObj = new URL(url);
    
    // Check if we have a hash fragment with the token
    if (urlObj.hash) {
      // Remove the leading # and parse the parameters
      const params = new URLSearchParams(urlObj.hash.substring(1));
      
      // Extract token data
      const accessToken = params.get('access_token');
      const tokenType = params.get('token_type');
      const expiresIn = params.get('expires_in');
      const scope = params.get('scope');
      
      if (!accessToken) {
        logger.error('No access token found in callback URL');
        return null;
      }
      
      return {
        access_token: accessToken,
        token_type: tokenType || 'Bearer',
        expires_in: parseInt(expiresIn) || 3600,
        scope: scope || ''
      };
    }
    
    // Check if we have query parameters with the token
    const accessToken = urlObj.searchParams.get('access_token');
    if (accessToken) {
      return {
        access_token: accessToken,
        token_type: urlObj.searchParams.get('token_type') || 'Bearer',
        expires_in: parseInt(urlObj.searchParams.get('expires_in')) || 3600,
        scope: urlObj.searchParams.get('scope') || ''
      };
    }
    
    return null;
  } catch (error) {
    logger.error('Error extracting token from URL:', error);
    return null;
  }
}

/**
 * Process the callback URL and handle the authentication
 * @param {string} url - Callback URL
 * @returns {Promise<{success: boolean, error?: string}>} - Result of processing
 */
export async function processCallbackUrl(url) {
  try {
    logger.log('Processing callback URL');
    
    // Extract token from URL
    const tokenData = extractTokenFromUrl(url);
    
    if (!tokenData) {
      return { success: false, error: 'Invalid callback URL or missing token' };
    }
    
    logger.log('Token extracted successfully');
    
    // Get user info from Google
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      
      if (!userInfoResponse.ok) {
        throw new Error(`Failed to get user info: ${userInfoResponse.status}`);
      }
      
      const userData = await userInfoResponse.json();
      
      if (!userData || !userData.email) {
        throw new Error('Invalid user data or missing email');
      }
      
      // Create session data
      const sessionData = {
        provider: 'google',
        provider_token: tokenData.access_token,
        access_token: tokenData.access_token,
        expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        user: {
          id: userData.sub,
          email: userData.email,
          user_metadata: {
            full_name: userData.name,
            avatar_url: userData.picture
          }
        }
      };
      
      // Store session data
      await storage.set(STORAGE_KEYS.SESSION, sessionData);
      await storage.set(STORAGE_KEYS.USER, sessionData.user);
      
      // Notify that auth state changed
      await storage.set(STORAGE_KEYS.AUTH_EVENT, {
        type: 'SIGNED_IN',
        timestamp: new Date().toISOString()
      });
      
      // Broadcast authentication success
      chrome.runtime.sendMessage({
        type: 'AUTH_STATE_CHANGE',
        event: 'SIGNED_IN',
        user: sessionData.user
      }).catch(err => {
        // Ignore errors from no listeners
        logger.debug('Error broadcasting auth state change (expected if no listeners):', err);
      });
      
      return {
        success: true,
        user: sessionData.user
      };
    } catch (error) {
      logger.error('Error processing user data:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to process user data' 
      };
    }
  } catch (error) {
    logger.error('Error processing callback URL:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to process authentication callback' 
    };
  }
}

/**
 * Set up listener for callback URLs in tabs
 * This will detect when a tab navigates to a callback URL and process it
 */
export function setupCallbackUrlListener() {
  try {
    logger.log('Setting up callback URL listener');
    
    // Listen for tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      // Only process if URL changed and is complete
      if (changeInfo.status === 'complete' && tab.url) {
        if (isCallbackUrl(tab.url)) {
          logger.log('Detected callback URL in tab:', tabId);
          
          // Process the callback URL
          processCallbackUrl(tab.url)
            .then(result => {
              if (result.success) {
                logger.log('Successfully processed callback URL');
                
                // Redirect to gallery
                chrome.tabs.update(tabId, { 
                  url: 'https://main-gallery-ai.lovable.app/gallery'
                });
              } else {
                logger.error('Failed to process callback URL:', result.error);
                
                // Show error in the tab
                chrome.tabs.executeScript(tabId, {
                  code: `
                    document.body.innerHTML = '<div style="text-align: center; padding: 50px;">
                      <h2>Authentication Error</h2>
                      <p>${result.error || 'Failed to authenticate with Google'}</p>
                      <button onclick="window.close()">Close</button>
                    </div>';
                  `
                }).catch(err => {
                  logger.error('Failed to inject error message:', err);
                });
              }
            })
            .catch(error => {
              logger.error('Error in callback processing:', error);
            });
        }
      }
    });
    
    logger.log('Callback URL listener set up successfully');
  } catch (error) {
    logger.error('Error setting up callback URL listener:', error);
  }
}
