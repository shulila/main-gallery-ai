
import { logger } from '../logger.js';
import { authService } from './auth-service.js';
import { syncAuthState } from '../cookie-sync.js';
import { WEB_APP_URLS } from '../oauth-config.js';

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
async function handleCallbackUrl(url: string, tabId: number): Promise<void> {
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
    } catch (error: any) {
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
async function showErrorInTab(tabId: number, errorMessage?: string): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (error: string) => {
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
export function isCallbackUrl(url: string): boolean {
  if (!url) return false;
  
  return url.startsWith(WEB_APP_URLS.AUTH_CALLBACK) || 
         (url.includes('callback') && 
          (url.includes('access_token=') || url.includes('code=')));
}

/**
 * Process callback URL
 */
export async function processCallbackUrl(url: string): Promise<CallbackResult> {
  try {
    return await authService.processGoogleCallback(url);
  } catch (error: any) {
    logger.error('Error processing callback URL:', error);
    return {
      success: false,
      error: error.message || 'Failed to process callback URL'
    };
  }
}
