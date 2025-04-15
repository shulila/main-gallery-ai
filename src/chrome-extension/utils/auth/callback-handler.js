
/**
 * Callback handler for MainGallery.AI Chrome Extension
 */

import { logger } from '../logger.js';
import { authService } from './auth-service.js';
import { syncAuthState } from '../cookie-sync.js';
import { WEB_APP_URLS } from '../oauth-config.js';

// Track processing state to prevent duplicate processing
let isProcessingCallback = false;
let lastProcessedUrl = '';

/**
 * Set up callback URL listener
 */
export function setupCallbackUrlListener() {
  try {
    logger.log('Setting up callback URL listener');
    
    // Listen for tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        handleCallbackUrl(tab.url, tabId);
      }
    });
    
    logger.log('Callback URL listener set up successfully');
  } catch (error) {
    logger.error('Error setting up callback URL listener:', error);
  }
}

/**
 * Handle detected callback URL
 */
async function handleCallbackUrl(url, tabId) {
  if (isCallbackUrl(url) && !isProcessingCallback && url !== lastProcessedUrl) {
    isProcessingCallback = true;
    lastProcessedUrl = url;
    
    try {
      const result = await processCallbackUrl(url);
      
      if (result.success) {
        await syncAuthState();
        chrome.tabs.update(tabId, { url: WEB_APP_URLS.GALLERY });
      } else {
        await showErrorInTab(tabId, result.error);
      }
    } catch (error) {
      await showErrorInTab(tabId, error.message);
    } finally {
      setTimeout(() => {
        isProcessingCallback = false;
      }, 1000);
    }
  }
}

/**
 * Show error message in tab
 */
async function showErrorInTab(tabId, errorMessage) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (error) => {
        document.body.innerHTML = `
          <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
            <h2>Authentication Error</h2>
            <p>${error || 'Failed to authenticate'}</p>
            <button onclick="window.close()" style="padding: 10px 20px; margin-top: 20px; cursor: pointer;">
              Close
            </button>
          </div>
        `;
      },
      args: [errorMessage || 'Authentication failed']
    });
  } catch (error) {
    logger.error('Error showing error in tab:', error);
  }
}

/**
 * Check if URL is a callback URL
 */
export function isCallbackUrl(url) {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    // Check for both /auth and /auth/callback paths
    return (urlObj.pathname === '/auth/callback' || urlObj.pathname === '/auth') && 
           (urlObj.hash && (urlObj.hash.includes('access_token=') || urlObj.hash.includes('code=')));
  } catch (error) {
    logger.error('Error checking callback URL:', error);
    return false;
  }
}

/**
 * Process callback URL
 */
export async function processCallbackUrl(url) {
  try {
    return await authService.processGoogleCallback(url);
  } catch (error) {
    logger.error('Error processing callback URL:', error);
    return {
      success: false,
      error: error.message || 'Failed to process callback URL'
    };
  }
}
