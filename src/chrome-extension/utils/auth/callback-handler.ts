
import { logger } from '../logger.js';
import { authService } from './auth-service.js';
import { syncAuthState } from '../cookie-sync.js';
import { WEB_APP_URLS, AUTH_TIMEOUTS } from '../oauth-config.js';
import { storage, STORAGE_KEYS } from '../storage.js';

let isProcessingCallback = false;
let lastProcessedUrl = '';

export function setupCallbackUrlListener() {
  try {
    logger.log('Setting up callback URL listener');
    
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url && 
          isCallbackUrl(tab.url) && !isProcessingCallback && 
          tab.url !== lastProcessedUrl) {
        
        handleCallback(tab.url, tabId);
      }
    });

    chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
      if (details.url && isCallbackUrl(details.url) && 
          !isProcessingCallback && details.url !== lastProcessedUrl) {
        
        handleCallback(details.url, details.tabId);
      }
    });

    logger.log('Callback URL listener set up successfully');
  } catch (error) {
    logger.error('Error setting up callback URL listener:', error);
  }
}

export function isCallbackUrl(url: string): boolean {
  if (!url) return false;
  
  if (url.startsWith(WEB_APP_URLS.AUTH_CALLBACK)) {
    return true;
  }
  
  return url.includes('callback') && 
         (url.includes('access_token=') || url.includes('code='));
}

async function handleCallback(url: string, tabId: number) {
  isProcessingCallback = true;
  lastProcessedUrl = url;

  try {
    await showLoadingUI(tabId);
    
    const result = await Promise.race([
      processCallbackUrl(url),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Authentication timed out')), 
        AUTH_TIMEOUTS.LOGIN_TIMEOUT)
      )
    ]);

    if (result.success) {
      await storage.set(STORAGE_KEYS.LAST_SYNC, Date.now());
      await syncAuthState();
      await chrome.tabs.update(tabId, { url: WEB_APP_URLS.GALLERY });
    } else {
      await showError(tabId, result.error);
    }
  } catch (error) {
    logger.error('Error in callback processing:', error);
    await showError(tabId, error.message);
  } finally {
    setTimeout(() => {
      isProcessingCallback = false;
    }, 1000);
  }
}

async function processCallbackUrl(url: string) {
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

async function showLoadingUI(tabId: number) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'mg-auth-loading';
        loadingDiv.innerHTML = `
          <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
            <h2>Completing Authentication</h2>
            <p>Please wait...</p>
            <div class="loader"></div>
          </div>
        `;
        loadingDiv.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(255,255,255,0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        `;
        document.body.appendChild(loadingDiv);
      }
    });
  } catch (error) {
    logger.warn('Error showing loading UI:', error);
  }
}

async function showError(tabId: number, message: string) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (errorMessage) => {
        document.body.innerHTML = `
          <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
            <h2>Authentication Error</h2>
            <p>${errorMessage || 'Failed to authenticate'}</p>
            <button onclick="window.close()" 
                    style="padding: 10px 20px; margin-top: 20px; cursor: pointer;">
              Close
            </button>
          </div>
        `;
      },
      args: [message]
    });
  } catch (error) {
    logger.error('Error showing error UI:', error);
  }
}

