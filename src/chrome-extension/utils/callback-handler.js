
/**
 * Callback handler for Google OAuth authentication
 * This module handles the callback URL with access_token from Google OAuth
 */

import { logger } from './logger.js';
import { supabase } from './supabaseClient.js';

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
    
    // Process the token with our custom handler
    const result = await supabase.auth.handleOAuthToken(
      tokenData.access_token, 
      'google'
    );
    
    if (result.error) {
      logger.error('Error handling OAuth token:', result.error);
      return { 
        success: false, 
        error: result.error.message || 'Authentication failed' 
      };
    }
    
    // Notify that auth state changed
    chrome.storage.local.set({ auth_event: 'SIGNED_IN' });
    
    return {
      success: true,
      user: result.data?.user || result.data?.session?.user
    };
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
                
                // Redirect to gallery or close the tab
                chrome.tabs.update(tabId, { 
                  url: getGalleryUrl() 
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

/**
 * Get the gallery URL
 * @returns {string} - Gallery URL
 */
function getGalleryUrl() {
  // Use the utility function if available, otherwise use hardcoded URL
  if (typeof window !== 'undefined' && window.getGalleryUrl) {
    return window.getGalleryUrl();
  }
  return 'https://main-gallery-ai.lovable.app/gallery';
}
