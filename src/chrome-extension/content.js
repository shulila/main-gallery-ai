
// This script runs in the context of the AI platform websites
console.log('MainGallery: Content script loaded and running');

// Configuration
const MAIN_GALLERY_APP_URL = 'https://main-gallery-hub.lovable.app';
const MAIN_GALLERY_API_URL = 'https://main-gallery-hub.lovable.app/api';

// Platform detection patterns
const PLATFORMS = {
  midjourney: {
    name: 'Midjourney',
    urlPatterns: [/midjourney\.com/, /discord\.com\/channels.*midjourney/],
    selectors: {
      gallery: 'main .gallery',
      header: '.Header_headerWrapper__HXZoP',
      messageToolbar: '.message-toolbar', 
      contentWrapper: '.content-1SgpWY',
      chatInput: '.chatContent-3KubbW'
    },
    loginCheck: {
      selectors: ['.user-name', '.userInfo-regGGv'],
      waitTime: 5000
    },
    galleryPagePatterns: [
      /midjourney\.com\/organize/,
      /midjourney\.com\/feed/,
      /midjourney\.com\/app/,
      /midjourney\.com\/archive/,
      /discord\.com\/channels.*midjourney/
    ]
  },
  dalle: {
    name: 'DALL·E',
    urlPatterns: [/openai\.com/],
    selectors: {
      gallery: '.gallery-images',
      header: '.header-container',
      toolbar: '.toolbar',
      contentWrapper: '.content-wrapper',
    },
    loginCheck: {
      selectors: ['.user-menu', '.avatar'],
      waitTime: 4000
    },
    galleryPagePatterns: [
      /openai\.com\/create/,
      /openai\.com\/collection/
    ]
  },
  stableDiffusion: {
    name: 'Stable Diffusion',
    urlPatterns: [/dreamstudio\.ai/, /stability\.ai/],
    selectors: {
      gallery: '.gallery-container',
      toolbar: '.menu-container',
      header: 'header',
      contentWrapper: '.content-area',
    },
    loginCheck: {
      selectors: ['.user-profile', '.user-info'],
      waitTime: 4000
    },
    galleryPagePatterns: [
      /dreamstudio\.ai\/gallery/,
      /dreamstudio\.ai\/workspace/
    ]
  },
  runway: {
    name: 'Runway',
    urlPatterns: [/runwayml\.com/],
    selectors: {
      gallery: '.gallery',
      toolbar: '.toolbar',
      header: 'header',
      contentWrapper: '.content',
    },
    loginCheck: {
      selectors: ['.user-menu', '.user-avatar'],
      waitTime: 4000
    },
    galleryPagePatterns: [
      /runwayml\.com\/projects/,
      /runwayml\.com\/assets/
    ]
  },
  pika: {
    name: 'Pika',
    urlPatterns: [/pika\.art/],
    selectors: {
      gallery: '.gallery-grid',
      toolbar: '.app-toolbar',
      header: 'header',
      contentWrapper: '.content-container',
    },
    loginCheck: {
      selectors: ['.user-avatar', '.user-dropdown'],
      waitTime: 4000
    },
    galleryPagePatterns: [
      /pika\.art\/profile/,
      /pika\.art\/videos/
    ]
  },
  leonardo: {
    name: 'Leonardo.ai',
    urlPatterns: [/leonardo\.ai/],
    selectors: {
      gallery: '.react-photo-album, .image-grid, .gallery-view',
      header: '.header, .navbar, nav, .appbar, .app-header',
      toolbar: '.toolbar, .tools, .controls, .action-bar',
      contentWrapper: '.content, main, .main-content, .page-content',
      canvas: '.canvas-area, .workspace, .editor',
      generationPanel: '.generation-panel, .sidebar, .control-panel',
    },
    loginCheck: {
      selectors: ['.user-avatar', '.user-profile', '.account-menu', '.avatar', '.user-name'],
      waitTime: 4000
    },
    galleryPagePatterns: [
      /leonardo\.ai\/gallery/,
      /leonardo\.ai\/generations/,
      /leonardo\.ai\/library/,
      /leonardo\.ai\/create/,
      /app\.leonardo\.ai/
    ]
  }
};

// UI constants
const UI = {
  colors: {
    primary: '#3957ed',
    text: '#ffffff',
    textDark: '#171717',
    bgLight: '#ffffff',
    bgDark: '#1c1c1c',
    hover: '#2a41b1',
    shadow: '0 2px 5px rgba(0,0,0,0.2)'
  },
  zIndex: 9999,
  transitions: '0.3s ease all',
  borderRadius: '16px',
  spacing: {
    sm: '8px',
    md: '12px',
    lg: '16px'
  }
};

// Track the elements we've added
let addedElements = {
  button: null,
  onboarding: null,
  floatingButton: null
};

// State management
let state = {
  platform: null,
  platformId: null,
  isLoggedInToGallery: false,
  isLoggedInToPlatform: false,
  isPlatformConnected: false,
  isGalleryPage: false
};

// Check if current page is a gallery page (not login, explore, etc)
function isGalleryPage() {
  const url = window.location.href;
  
  if (!state.platform || !state.platformId) {
    return false;
  }
  
  // Check gallery page patterns for current platform
  const galleryPatterns = state.platform.galleryPagePatterns || [];
  return galleryPatterns.some(pattern => pattern.test(url));
}

// Check if a platform is connected
function isPlatformConnected(platformId) {
  return new Promise(resolve => {
    chrome.storage.local.get([`platform_${platformId}_connected`], result => {
      resolve(!!result[`platform_${platformId}_connected`]);
    });
  });
}

// Check if user is logged in to Main Gallery
function isLoggedInToGallery() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['main_gallery_auth_token'], result => {
      resolve(!!result.main_gallery_auth_token);
    });
  });
}

// Detect the current platform
function detectPlatform() {
  const url = window.location.href;
  
  for (const [id, platform] of Object.entries(PLATFORMS)) {
    for (const pattern of platform.urlPatterns) {
      if (pattern.test(url)) {
        console.log(`MainGallery: Detected platform ${id}`);
        return { id, ...platform };
      }
    }
  }
  
  return null;
}

// Check if user is logged into the platform
function checkPlatformLogin(platform) {
  return new Promise(resolve => {
    // Look for login indicators
    const loginCheck = platform.loginCheck || {
      selectors: ['.user-avatar', '.user-profile', '.avatar'],
      waitTime: 4000
    };
    
    // Try immediate check
    const isLoggedIn = loginCheck.selectors.some(selector => 
      document.querySelector(selector) !== null
    );
    
    if (isLoggedIn) {
      console.log(`MainGallery: User is logged in to ${platform.name}`);
      resolve(true);
      return;
    }
    
    // If not found immediately, wait a bit for the page to fully load
    console.log(`MainGallery: User login status unknown, waiting up to ${loginCheck.waitTime}ms...`);
    
    let checkInterval;
    const timeout = setTimeout(() => {
      if (checkInterval) clearInterval(checkInterval);
      console.log(`MainGallery: Timed out waiting for login indicators on ${platform.name}`);
      resolve(false);
    }, loginCheck.waitTime);
    
    checkInterval = setInterval(() => {
      const found = loginCheck.selectors.some(selector => 
        document.querySelector(selector) !== null
      );
      
      if (found) {
        clearTimeout(timeout);
        clearInterval(checkInterval);
        console.log(`MainGallery: User is logged in to ${platform.name} (detected after delay)`);
        resolve(true);
      }
    }, 500);
  });
}

// Create floating connect button with Apple-like refined styling
function createFloatingConnectButton() {
  // Remove existing button if present
  if (addedElements.floatingButton) {
    addedElements.floatingButton.remove();
    addedElements.floatingButton = null;
  }
  
  // Only show on gallery pages - THIS IS CRITICAL
  if (!state.isGalleryPage) {
    console.log('MainGallery: Not on a gallery page, not showing floating button');
    return null;
  }
  
  // Only show if user is logged in to MainGallery but platform not connected
  if (!state.isLoggedInToGallery || state.isPlatformConnected) {
    console.log('MainGallery: User not logged in or platform already connected, not showing floating button');
    return null;
  }
  
  // Only show if user is logged in to the platform
  if (!state.isLoggedInToPlatform) {
    console.log('MainGallery: User not logged in to platform, not showing floating button');
    return null;
  }
  
  console.log('MainGallery: Creating floating connect button - all conditions met');
  
  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'mg-floating-connect-button-container';
  buttonContainer.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: ${UI.zIndex};
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.3s ease, transform 0.3s ease;
  `;
  
  // Create the actual button - Apple-style design
  const button = document.createElement('button');
  button.className = 'mg-floating-connect-button';
  
  // Apply refined Apple-inspired styling
  button.style.cssText = `
    background-color: white;
    color: ${UI.colors.primary};
    border: none;
    border-radius: 28px;
    padding: ${UI.spacing.md};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 48px;
    height: 48px;
    overflow: hidden;
    white-space: nowrap;
  `;
  
  // Create logo icon
  const logoImg = document.createElement('img');
  logoImg.src = chrome.runtime.getURL('icons/icon48.png');
  logoImg.alt = 'MainGallery';
  logoImg.style.cssText = `
    width: 24px;
    height: 24px;
    border-radius: 6px;
    transition: all 0.3s ease;
  `;
  
  // Create plus icon that will appear on hover
  const plusIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  plusIcon.setAttribute("width", "20");
  plusIcon.setAttribute("height", "20");
  plusIcon.setAttribute("viewBox", "0 0 24 24");
  plusIcon.setAttribute("fill", "none");
  plusIcon.setAttribute("stroke", "currentColor");
  plusIcon.setAttribute("stroke-width", "2");
  plusIcon.setAttribute("stroke-linecap", "round");
  plusIcon.setAttribute("stroke-linejoin", "round");
  plusIcon.style.cssText = `
    display: none;
    transition: all 0.3s ease;
  `;
  
  // Create plus icon path
  const plusPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  plusPath.setAttribute("d", "M12 5v14M5 12h14");
  plusIcon.appendChild(plusPath);
  
  // Create text span that will appear on hover
  const textSpan = document.createElement('span');
  textSpan.textContent = `Add to MainGallery`;
  textSpan.style.cssText = `
    opacity: 0;
    width: 0;
    margin-left: 0;
    transform: translateX(-10px);
    transition: all 0.3s ease;
    font-size: 14px;
    white-space: nowrap;
  `;
  
  // Append elements
  button.appendChild(logoImg);
  button.appendChild(plusIcon);
  button.appendChild(textSpan);
  buttonContainer.appendChild(button);
  
  // Create tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'mg-tooltip';
  tooltip.textContent = 'Connect this platform to MainGallery';
  tooltip.style.cssText = `
    position: fixed;
    background-color: white;
    color: #1e293b;
    border-radius: 12px;
    padding: 10px 14px;
    font-size: 13px;
    max-width: 250px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: ${UI.zIndex + 1};
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease, transform 0.3s ease;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  document.body.appendChild(tooltip);
  
  // Add hover effects
  button.addEventListener('mouseenter', () => {
    button.style.backgroundColor = UI.colors.primary;
    button.style.color = 'white';
    button.style.transform = 'translateY(-2px)';
    button.style.boxShadow = '0 4px 16px rgba(57, 87, 237, 0.25)';
    button.style.width = 'auto';
    button.style.paddingRight = '18px';
    logoImg.style.display = 'none';
    plusIcon.style.display = 'block';
    textSpan.style.opacity = '1';
    textSpan.style.width = 'auto';
    textSpan.style.marginLeft = '8px';
    textSpan.style.transform = 'translateX(0)';
    
    // Position and show tooltip
    const rect = button.getBoundingClientRect();
    tooltip.style.bottom = `${window.innerHeight - rect.top + 10}px`;
    tooltip.style.left = `${rect.left + rect.width / 2 - 125}px`;
    tooltip.style.opacity = '1';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.backgroundColor = 'white';
    button.style.color = UI.colors.primary;
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.1)';
    button.style.paddingRight = '12px';
    logoImg.style.display = 'block';
    plusIcon.style.display = 'none';
    textSpan.style.opacity = '0';
    textSpan.style.width = '0';
    textSpan.style.marginLeft = '0';
    textSpan.style.transform = 'translateX(-10px)';
    
    // Hide tooltip
    tooltip.style.opacity = '0';
  });
  
  // Add click handler
  button.addEventListener('click', async (e) => {
    // Stop event propagation
    e.preventDefault();
    e.stopPropagation();
    
    // Show click animation
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
      button.style.transform = 'scale(1)';
    }, 100);
    
    // Convert to loading state
    plusIcon.style.display = 'none';
    logoImg.style.display = 'none';
    
    const loaderSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    loaderSvg.setAttribute("width", "20");
    loaderSvg.setAttribute("height", "20");
    loaderSvg.setAttribute("viewBox", "0 0 24 24");
    loaderSvg.style.animation = "mg-spin 1s linear infinite";
    
    const circlePath = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circlePath.setAttribute("cx", "12");
    circlePath.setAttribute("cy", "12");
    circlePath.setAttribute("r", "10");
    circlePath.setAttribute("fill", "none");
    circlePath.setAttribute("stroke", "currentColor");
    circlePath.setAttribute("stroke-width", "2");
    circlePath.setAttribute("stroke-dasharray", "60");
    circlePath.setAttribute("stroke-dashoffset", "0");
    loaderSvg.appendChild(circlePath);
    
    button.insertBefore(loaderSvg, plusIcon);
    
    textSpan.textContent = "Connecting...";
    textSpan.style.opacity = '1';
    textSpan.style.width = 'auto';
    textSpan.style.marginLeft = '8px';
    
    // Add the spin animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes mg-spin {
        0% { transform: rotate(0deg); stroke-dashoffset: 60; }
        100% { transform: rotate(360deg); stroke-dashoffset: 0; }
      }
    `;
    document.head.appendChild(style);
    
    // Send message to initiate platform connection
    chrome.runtime.sendMessage({
      action: 'initiatePlatformConnection',
      platform: state.platformId
    });
    
    // Then handle the connection
    await handleAddToGallery();
    
    // Show success and remove button
    textSpan.textContent = "Connected!";
    button.style.backgroundColor = '#16a34a';
    button.style.color = 'white';
    
    // Replace loader with checkmark
    loaderSvg.remove();
    const checkSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    checkSvg.setAttribute("width", "20");
    checkSvg.setAttribute("height", "20");
    checkSvg.setAttribute("viewBox", "0 0 24 24");
    checkSvg.setAttribute("fill", "none");
    checkSvg.setAttribute("stroke", "currentColor");
    checkSvg.setAttribute("stroke-width", "2");
    checkSvg.setAttribute("stroke-linecap", "round");
    checkSvg.setAttribute("stroke-linejoin", "round");
    
    const checkPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    checkPath.setAttribute("d", "M20 6L9 17l-5-5");
    checkSvg.appendChild(checkPath);
    button.insertBefore(checkSvg, plusIcon);
    
    // Update state to reflect connection
    state.isPlatformConnected = true;
    
    setTimeout(() => {
      buttonContainer.style.opacity = '0';
      buttonContainer.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        buttonContainer.remove();
        tooltip.remove();
        
        // Open gallery automatically after connection succeeds
        chrome.runtime.sendMessage({ action: 'openGallery' });
      }, 300);
    }, 1500);
  });
  
  // Add to document and animate in
  document.body.appendChild(buttonContainer);
  
  // Animate in after a short delay
  setTimeout(() => {
    buttonContainer.style.opacity = '1';
    buttonContainer.style.transform = 'translateY(0)';
  }, 300);
  
  // Store reference
  addedElements.floatingButton = buttonContainer;
  
  return buttonContainer;
}

// Handle adding to gallery
async function handleAddToGallery() {
  // Get current content from the page
  // In a real implementation, this would collect image URLs and prompt data
  // For this demo, we'll use placeholder data for visualization
  
  // Collect images from the platform's gallery
  const images = Array.from(document.querySelectorAll('img'))
    .filter(img => {
      // Filter for images that are likely to be AI generated content
      // This is a simplified approach and would be more sophisticated in production
      const src = img.src || '';
      const width = img.width || 0;
      const height = img.height || 0;
      
      // Only consider reasonably sized images, not icons or thumbnails
      return (width > 150 && height > 150 && !src.includes('icon') && !src.includes('logo'));
    })
    .slice(0, 5) // Limit to first 5 matching images
    .map(img => img.src);
  
  // Build data packet to send
  const data = {
    platformId: state.platformId,
    imageUrls: images.length > 0 ? images : ['https://placeholder.com/image.jpg'], // Fallback if no images found
    prompt: 'Collected from ' + state.platform.name,
    timestamp: new Date().toISOString()
  };
  
  console.log('Collected gallery data:', data);
  
  // Send message to background script
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: 'addToGallery',
      data: data
    }, function(response) {
      if (response && response.success) {
        console.log('Successfully added to gallery:', response);
        // Update UI to show success
        state.isPlatformConnected = true;
        updateUI();
        resolve(true);
      } else {
        console.error('Failed to add to gallery:', response?.error || 'Unknown error');
        resolve(false);
      }
    });
  });
}

// Update the UI based on current state
async function updateUI() {
  console.log('MainGallery: Updating UI with state:', state);
  
  // Check login and platform connection status
  state.isLoggedInToGallery = await isLoggedInToGallery();
  state.isPlatformConnected = state.platformId ? await isPlatformConnected(state.platformId) : false;
  state.isGalleryPage = isGalleryPage();
  
  console.log('MainGallery: Updated state:', {
    isLoggedInToGallery: state.isLoggedInToGallery,
    isLoggedInToPlatform: state.isLoggedInToPlatform,
    isPlatformConnected: state.isPlatformConnected,
    isGalleryPage: state.isGalleryPage
  });
  
  // Create or update the floating button (only if all conditions are met)
  if (state.isLoggedInToGallery && state.isLoggedInToPlatform && !state.isPlatformConnected && state.isGalleryPage) {
    console.log('MainGallery: All conditions met for floating button - creating it');
    createFloatingConnectButton();
  } else if (addedElements.floatingButton) {
    // Remove the button if conditions are not met
    console.log('MainGallery: Conditions for floating button not met - removing it');
    addedElements.floatingButton.remove();
    addedElements.floatingButton = null;
  }
}

// Initialize extension UI
async function initialize() {
  console.log('MainGallery: Initializing content script');
  
  // Detect the current platform
  state.platform = detectPlatform();
  state.platformId = state.platform?.id;
  
  if (!state.platform) {
    console.log('MainGallery: Not on a supported platform');
    return;
  }
  
  console.log(`MainGallery: Detected platform ${state.platform.name}`);
  
  // Check if user is logged in to platform
  state.isLoggedInToPlatform = await checkPlatformLogin(state.platform);
  console.log(`MainGallery: User is ${state.isLoggedInToPlatform ? '' : 'not '}logged in to ${state.platform.name}`);
  
  // Check if current page is a gallery page
  state.isGalleryPage = isGalleryPage();
  console.log(`MainGallery: Current page is ${state.isGalleryPage ? '' : 'not '}a gallery page`);
  
  // Initialize UI for first time
  updateUI();
  
  // Set up mutation observer to keep UI alive
  setupMutationObserver();
  
  // Tell background script we're ready and get initial data
  chrome.runtime.sendMessage({ action: 'contentScriptLoaded' }, response => {
    if (response && response.success) {
      console.log('MainGallery: Successfully connected to background script');
    }
  });
}

// Set up mutation observer to ensure our UI stays visible
function setupMutationObserver() {
  // Create an observer that will check if our elements have been removed
  const observer = new MutationObserver((mutations) => {
    // Check if our elements have been removed
    for (const key in addedElements) {
      if (addedElements[key] && !document.contains(addedElements[key])) {
        console.log(`MainGallery: ${key} was removed, re-adding`);
        addedElements[key] = null;
        updateUI();
      }
    }
    
    // Check if URL has changed (SPA navigation)
    const urlHasChanged = mutations.some(mutation => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'href') {
        return true;
      }
      return false;
    });
    
    if (urlHasChanged) {
      console.log('MainGallery: URL changed, updating gallery page status');
      state.isGalleryPage = isGalleryPage();
      updateUI();
    }
    
    // Check if platform login status might have changed
    const loginIndicatorsChanged = mutations.some(mutation => {
      // Look for login-related elements that might have been added
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        const platformLoginSelectors = state.platform?.loginCheck?.selectors || [];
        
        return Array.from(mutation.addedNodes).some(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if this node is a login indicator
            if (platformLoginSelectors.some(selector => node.matches?.(selector))) {
              return true;
            }
            
            // Or if it contains login indicators
            return platformLoginSelectors.some(selector => 
              node.querySelector?.(selector)
            );
          }
          return false;
        });
      }
      return false;
    });
    
    if (loginIndicatorsChanged) {
      console.log('MainGallery: Login indicators changed, checking login status');
      checkPlatformLogin(state.platform).then(isLoggedIn => {
        if (isLoggedIn !== state.isLoggedInToPlatform) {
          console.log(`MainGallery: Platform login status changed to ${isLoggedIn ? 'logged in' : 'logged out'}`);
          state.isLoggedInToPlatform = isLoggedIn;
          updateUI();
        }
      });
    }
  });
  
  // Start observing the document body
  observer.observe(document.body, { 
    childList: true, 
    subtree: true,
    attributes: true,
    attributeFilter: ['href'],
    characterData: false
  });
}

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('MainGallery: Content script received message:', message);
  
  if (message.action === 'platformDetected') {
    console.log(`MainGallery: Background script detected platform ${message.platformId}`);
    sendResponse({ success: true });
  } else if (message.action === 'authStateChanged') {
    console.log(`MainGallery: Auth state changed, isLoggedIn: ${message.isLoggedIn}`);
    state.isLoggedInToGallery = message.isLoggedIn;
    updateUI();
    sendResponse({ success: true });
    
    // If user logged out, reset platform connected state
    if (!message.isLoggedIn) {
      state.isPlatformConnected = false;
    }
  } else if (message.action === 'platformConnected') {
    console.log(`MainGallery: Platform ${message.platformId} connected`);
    if (message.platformId === state.platformId) {
      state.isPlatformConnected = true;
      updateUI();
    }
    sendResponse({ success: true });
  } else if (message.action === 'checkPlatformLogin') {
    // Check if user is logged in to platform
    if (state.platform) {
      checkPlatformLogin(state.platform).then(isLoggedIn => {
        state.isLoggedInToPlatform = isLoggedIn;
        sendResponse({ isLoggedIn: isLoggedIn });
      });
      return true; // Will respond asynchronously
    } else {
      sendResponse({ isLoggedIn: false });
    }
  } else if (message.action === 'isGalleryPage') {
    // Check if current page is a gallery page
    const isGalleryPage = state.isGalleryPage;
    console.log(`MainGallery: Checking if gallery page: ${isGalleryPage}`);
    sendResponse({ isGalleryPage: isGalleryPage });
  } else if (message.action === 'showConnectButton') {
    // Show floating connect button if appropriate
    if (state.isGalleryPage && state.isLoggedInToPlatform && !state.isPlatformConnected) {
      console.log('MainGallery: Showing connect button');
      createFloatingConnectButton();
    }
    sendResponse({ success: true });
  }
  
  return true;
});

// Initialize when the page is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
