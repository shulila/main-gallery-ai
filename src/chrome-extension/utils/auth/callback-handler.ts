
import { logger } from '../logger.js';
import { authService } from './auth-service.js';
import { syncAuthState } from '../cookie-sync.js';
import { WEB_APP_URLS, AUTH_TIMEOUTS } from '../oauth-config.js';
import { storage, STORAGE_KEYS } from '../storage.js';

interface CallbackResult {
  success: boolean;
  error?: string;
  user?: any;
}

// Track processing state to prevent duplicate processing
let isProcessingCallback = false;
let lastProcessedUrl = '';

/**
 * Set up callback URL listener
 */
export function setupCallbackUrlListener(): void {
  try {
    logger.log('Setting up callback URL listener');
    
    // Listen for tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      // Only process if URL changed and is complete
      if (changeInfo.status === 'complete' && tab.url) {
        handleCallbackUrl(tab.url, tabId);
      }
    });
    
    // Also listen for navigation events to catch redirects
    chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
      if (details.url) {
        handleCallbackUrl(details.url, details.tabId);
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
async function handleCallbackUrl(url: string, tabId: number): Promise<void> {
  if (isCallbackUrl(url) && !isProcessingCallback && url !== lastProcessedUrl) {
    logger.log('Detected callback URL in tab:', tabId);
    
    // Set processing flag to prevent duplicate processing
    isProcessingCallback = true;
    lastProcessedUrl = url;
    
    try {
      // Process the callback URL
      const result = await processCallbackUrl(url, tabId);
      
      if (result.success) {
        logger.log('Successfully processed callback URL');
        
        // Sync auth state with web app
        await syncAuthState();
        
        // Redirect to gallery
        chrome.tabs.update(tabId, { url: WEB_APP_URLS.GALLERY });
      } else {
        logger.error('Failed to process callback URL:', result.error);
        
        // Show error in the tab
        await showErrorInTab(tabId, result.error);
      }
    } catch (error: any) {
      logger.error('Error in callback processing:', error);
      await showErrorInTab(tabId, error.message);
    } finally {
      // Reset processing flag
      setTimeout(() => {
        isProcessingCallback = false;
      }, 1000);
    }
  }
}

/**
 * Show error message in tab
 */
async function showErrorInTab(tabId: number, errorMessage?: string): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (error: string) => {
        document.body.innerHTML = `
          <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
            <h2>Authentication Error</h2>
            <p>${error || 'Failed to authenticate with Google'}</p>
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
 * Check if the current URL is a callback URL with access_token
 */
export function isCallbackUrl(url: string): boolean {
  if (!url) return false;
  
  // Check if URL is from our webapp callback
  if (url.startsWith(WEB_APP_URLS.AUTH_CALLBACK)) {
    return true;
  }
  
  // Also check for any URL with access_token or code
  return url.includes('callback') && 
         (url.includes('access_token=') || url.includes('code='));
}

/**
 * Process the callback URL and handle the authentication
 */
export async function processCallbackUrl(url: string, tabId?: number): Promise<CallbackResult> {
  try {
    logger.log('Processing callback URL');
    
    // Show loading indicator in the tab
    if (tabId) {
      try {
        await showLoadingInTab(tabId);
      } catch (error) {
        logger.error('Error showing loading indicator:', error);
        // Continue processing even if showing loading fails
      }
    }
    
    // Set a timeout to prevent hanging
    const timeoutPromise = new Promise<CallbackResult>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Authentication timed out'));
      }, AUTH_TIMEOUTS.LOGIN_TIMEOUT);
    });
    
    // Process the callback
    const processingPromise = authService.processGoogleCallback(url);
    
    // Race between processing and timeout
    const result = await Promise.race([processingPromise, timeoutPromise]);
    
    if (result.success) {
      // Store the last successful auth time
      await storage.set(STORAGE_KEYS.LAST_SYNC, Date.now());
      
      // Sync auth state with web app
      await syncAuthState();
    }
    
    return result;
  } catch (error: any) {
    logger.error('Error processing callback URL:', error);
    return {
      success: false,
      error: error.message || 'Failed to process callback URL'
    };
  }
}

/**
 * Show loading indicator in tab
 */
async function showLoadingInTab(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const loadingDiv = document.createElement('div');
      loadingDiv.id = 'mg-auth-loading';
      loadingDiv.style.position = 'fixed';
      loadingDiv.style.top = '0';
      loadingDiv.style.left = '0';
      loadingDiv.style.width = '100%';
      loadingDiv.style.height = '100%';
      loadingDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
      loadingDiv.style.display = 'flex';
      loadingDiv.style.flexDirection = 'column';
      loadingDiv.style.alignItems = 'center';
      loadingDiv.style.justifyContent = 'center';
      loadingDiv.style.zIndex = '9999';
      loadingDiv.innerHTML = `
        <div style="text-align: center; font-family: Arial, sans-serif;">
          <h2>Completing Authentication</h2>
          <p>Please wait while we complete the authentication process...</p>
          <div style="width: 50px; height: 50px; border: 5px solid #f3f3f3; border-top: 5px solid #3498db; border-radius: 50%; animation: spin 2s linear infinite;"></div>
        </div>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      `;
      document.body.appendChild(loadingDiv);
    }
  });
}
