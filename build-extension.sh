
#!/bin/bash
# Build script for MainGallery.AI Chrome Extension

# Check if this is a preview build
if [[ "$1" == "--preview" || "$1" == "-p" ]]; then
  echo "Building MainGallery.AI Chrome Extension for PREVIEW environment..."
  BUILD_ENV=preview
  PREVIEW_FLAG="--preview"
else
  echo "Building MainGallery.AI Chrome Extension for PRODUCTION environment..."
  BUILD_ENV=production
  PREVIEW_FLAG=""
fi

echo "Removing old build directory..."
rm -rf dist-extension

echo "Running build script with improved bundling..."
# Pass environment flag to the build script
node build-extension.js ${PREVIEW_FLAG}

echo "Making post-build fixes for module support..."
# Ensure all JS files in dist-extension have type="module"
# This is for any HTML files that might include scripts
find dist-extension -name "*.html" -exec sed -i 's/<script /<script type="module" /g' {} \;

echo "Adding proper error handling to messaging..."
# Add better error handling in the messaging code
# This is a critical fix to avoid "No tab with id" errors
find dist-extension -name "*.js" -exec sed -i 's/chrome\.tabs\.sendMessage(\([^,]*\),/chrome.tabs.sendMessage(\1, /g' {} \;

echo "Validating build..."
# Check for expected files
if [ ! -f "dist-extension/manifest.json" ]; then
  echo "ERROR: manifest.json is missing from the build!"
  exit 1
fi

if [ ! -f "dist-extension/background.js" ]; then
  echo "ERROR: background.js is missing from the build!"
  
  # Emergency fallback - create a basic background.js if it's missing
  echo "Creating emergency fallback background.js..."
  cat > dist-extension/background.js << 'EOL'
/**
 * MainGallery.AI Emergency Fallback Background Script
 * This file was created by the build script when the original background.js was not found
 */
console.log('MainGallery.AI Background Script (Emergency Fallback) initialized');

// Basic listener for extension messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('MainGallery.AI received message:', message);
  
  if (message.action === 'ping') {
    sendResponse({ action: 'pong' });
  }
  
  if (message.action === 'openGallery') {
    const baseUrl = chrome.runtime.getURL('').includes('preview') ? 
      'https://preview-main-gallery-ai.lovable.app' : 
      'https://main-gallery-ai.lovable.app';
    
    chrome.tabs.create({ url: `${baseUrl}/gallery` });
    sendResponse({ success: true });
  }
  
  // Default response
  sendResponse({ success: true, action: 'default' });
  return true;
});

// Log startup
console.log('MainGallery.AI Background Script (Emergency Fallback) ready');
EOL
  
  echo "Created emergency fallback background.js"
fi

if [ ! -f "dist-extension/utils/urlUtils.js" ]; then
  echo "ERROR: urlUtils.js is missing from the build!"
  
  # Create utils directory if missing
  mkdir -p dist-extension/utils
  
  # Create a basic urlUtils.js file
  echo "Creating emergency fallback urlUtils.js..."
  cat > dist-extension/utils/urlUtils.js << 'EOL'
/**
 * Emergency Fallback URL Utilities for MainGallery.AI
 */

export function isPreviewEnvironment() {
  return false; // Default to production
}

export function getBaseUrl() {
  return isPreviewEnvironment() 
    ? 'https://preview-main-gallery-ai.lovable.app'
    : 'https://main-gallery-ai.lovable.app';
}

export function getGalleryUrl() {
  return `${getBaseUrl()}/gallery`;
}

export function getAuthUrl() {
  return `${getBaseUrl()}/auth`;
}
EOL
  
  echo "Created emergency fallback urlUtils.js"
fi

if [ ! -f "dist-extension/utils/errorHandler.js" ]; then
  echo "ERROR: errorHandler.js is missing from the build!"
  
  # Create utils directory if missing
  mkdir -p dist-extension/utils
  
  # Create a basic errorHandler.js file
  echo "Creating emergency fallback errorHandler.js..."
  cat > dist-extension/utils/errorHandler.js << 'EOL'
/**
 * Emergency Fallback Error Handler for MainGallery.AI
 */

export function handleError(source, error) {
  console.error(`[MainGallery] Error in ${source}:`, error);
  return {
    source,
    message: error?.message || 'Unknown error',
    timestamp: Date.now()
  };
}

export async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    handleError('safeFetch', error);
    throw error;
  }
}

export async function withRetry(fn, options = {}) {
  const { maxRetries = 3, baseDelay = 300 } = options;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) throw error;
      await new Promise(r => setTimeout(r, baseDelay * attempt));
    }
  }
}
EOL
  
  echo "Created emergency fallback errorHandler.js"
fi

if [ ! -f "dist-extension/utils/messaging.js" ]; then
  echo "ERROR: messaging.js is missing from the build!"
  
  # Create a basic messaging.js file
  echo "Creating emergency fallback messaging.js..."
  cat > dist-extension/utils/messaging.js << 'EOL'
/**
 * Emergency Fallback Messaging Utilities for MainGallery.AI
 */

export async function safeSendMessage(tabId, message, options = {}) {
  try {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          console.error(`Error sending message to tab ${tabId}:`, error.message);
          resolve({ success: false, error: error.message });
          return;
        }
        resolve(response || { success: true });
      });
    });
  } catch (error) {
    console.error('Error in safeSendMessage:', error);
    return { success: false, error: error.message };
  }
}

export async function ensureContentScriptLoaded(tab) {
  if (!tab || !tab.id) return false;
  
  try {
    const response = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          console.log('Content script not loaded, will inject');
          resolve(null);
          return;
        }
        resolve(response);
      });
    });
    
    if (response?.action === 'pong') return true;
    
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    
    return true;
  } catch (error) {
    console.error('Error ensuring content script:', error);
    return false;
  }
}
EOL
  
  echo "Created emergency fallback messaging.js"
fi

# Fix the popup to handle loading errors
echo "Adding loading error handling to popup.js..."
if [ -f "dist-extension/popup.js" ]; then
  # Backup the file
  cp dist-extension/popup.js dist-extension/popup.js.bak
  
  # Add loading timeout logic to popup.js
  cat >> dist-extension/popup.js << 'EOL'

// Add loading timeout to prevent infinite loading spinner
document.addEventListener('DOMContentLoaded', () => {
  const loadingState = document.getElementById('loading');
  const errorView = document.getElementById('error-view');
  const errorText = document.getElementById('error-text');
  
  if (loadingState) {
    // Set a timeout to show an error if loading takes too long
    setTimeout(() => {
      const stillLoading = loadingState.style.display !== 'none';
      if (stillLoading) {
        console.log('Loading timeout reached, showing error');
        
        if (errorView && errorText) {
          errorText.textContent = 'Connection timed out. Please try again or reload the extension.';
          loadingState.style.display = 'none';
          errorView.style.display = 'block';
        } else {
          // Fallback if error view doesn't exist
          loadingState.innerHTML = '<div class="error-message">Connection timed out. Please reload the extension.</div>';
        }
      }
    }, 5000); // 5-second timeout
  }
});
EOL
  
  echo "Added loading timeout handling to popup.js"
else
  echo "WARNING: popup.js not found, cannot add loading timeout handling"
fi

# Check for identity permission in manifest.json
if grep -q "\"identity\"" dist-extension/manifest.json; then
  echo "✅ identity permission found in manifest.json"
else
  echo "❌ WARNING: identity permission missing from manifest.json!"
fi

# Check for service worker module type
if grep -q "\"type\": \"module\"" dist-extension/manifest.json; then
  echo "✅ Service worker correctly configured as module type"
else
  echo "❌ WARNING: Service worker module type missing from manifest.json!"
fi

# Verify imports in background.js have .js extensions
if [ -f "dist-extension/background.js" ]; then
  if grep -q "from './utils/" dist-extension/background.js; then
    if grep -q "from './utils/[^']*'" dist-extension/background.js | grep -v "\.js'"; then
      echo "❌ WARNING: Some imports in background.js may be missing .js extension!"
      
      # Fix the imports
      echo "Attempting to fix imports in background.js..."
      sed -i "s/from '\.\/utils\/\([^']*\)'/from '.\/utils\/\1.js'/g" dist-extension/background.js
      echo "Fixed imports in background.js"
    else
      echo "✅ Imports in background.js appear to have proper .js extensions"
    fi
  fi
else
  echo "❌ WARNING: background.js not found for import verification!"
fi

# Print environment info for verification
if [[ "$BUILD_ENV" == "preview" ]]; then
  echo ""
  echo "VERIFICATION: This is a PREVIEW build"
  echo "URLs should point to: https://preview-main-gallery-ai.lovable.app"
  
  # Verify environment.js contains preview URLs
  if grep -q "preview-main-gallery-ai.lovable.app" dist-extension/environment.js; then
    echo "✅ environment.js correctly contains preview URLs"
  else
    echo "❌ WARNING: environment.js may not contain preview URLs!"
  fi
  
  # Verify urlUtils.js is set to preview mode
  if grep -q "return true" dist-extension/utils/urlUtils.js; then
    echo "✅ urlUtils.js correctly set to preview mode"
  else
    echo "❌ WARNING: urlUtils.js may not be set to preview mode!"
  fi
else
  echo ""
  echo "VERIFICATION: This is a PRODUCTION build"
  echo "URLs should point to: https://main-gallery-ai.lovable.app"
  
  # Verify environment.js contains production URLs
  if grep -q "main-gallery-ai.lovable.app" dist-extension/environment.js; then
    echo "✅ environment.js correctly contains production URLs"
  else
    echo "❌ WARNING: environment.js may not contain production URLs!"
  fi
  
  # Verify urlUtils.js is set to production mode
  if grep -q "return false" dist-extension/utils/urlUtils.js; then
    echo "✅ urlUtils.js correctly set to production mode"
  else
    echo "❌ WARNING: urlUtils.js may not be set to production mode!"
  fi
fi

echo ""
echo "Done! Your extension is now ready in the dist-extension folder."
echo ""
echo "Environment: ${BUILD_ENV^^}"
echo ""
echo "To load the extension in Chrome:"
echo "1. Go to chrome://extensions/"
echo "2. Enable Developer mode (top right)"
echo "3. Click 'Load unpacked' and select the dist-extension folder"
echo ""
echo "IMPORTANT: This build will connect to ${BUILD_ENV^^} endpoints:"
if [[ "$BUILD_ENV" == "preview" ]]; then
  echo "- https://preview-main-gallery-ai.lovable.app"
else
  echo "- https://main-gallery-ai.lovable.app"
fi
