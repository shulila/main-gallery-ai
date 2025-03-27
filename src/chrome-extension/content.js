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
      // Different locations where we can inject our button
      gallery: 'main .gallery',
      header: '.Header_headerWrapper__HXZoP',
      messageToolbar: '.message-toolbar', 
      contentWrapper: '.content-1SgpWY',
      chatInput: '.chatContent-3KubbW'
    },
    loginCheck: {
      // Elements that indicate the user is logged in
      selectors: ['.user-name', '.userInfo-regGGv'],
      waitTime: 5000 // How long to wait for login elements to appear
    }
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
    }
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
    }
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
    }
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
    }
  },
  leonardo: {
    name: 'Leonardo.ai',
    urlPatterns: [/leonardo\.ai/],
    selectors: {
      // Attempt to find the gallery container with different possible selectors
      gallery: '.react-photo-album, .image-grid, .gallery-view',
      // Potential headers or nav areas
      header: '.header, .navbar, nav, .appbar, .app-header',
      // Toolbar areas
      toolbar: '.toolbar, .tools, .controls, .action-bar',
      // Main content wrappers
      contentWrapper: '.content, main, .main-content, .page-content',
      // Common canvas areas
      canvas: '.canvas-area, .workspace, .editor',
      // Generation panel
      generationPanel: '.generation-panel, .sidebar, .control-panel',
    },
    loginCheck: {
      // Elements that might indicate a user is logged in
      selectors: ['.user-avatar', '.user-profile', '.account-menu', '.avatar', '.user-name'],
      waitTime: 4000 // Wait time in ms for login elements to appear
    }
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
  transitions: '0.3s ease all'
};

// Track the elements we've added
let addedElements = {
  button: null,
  onboarding: null
};

// State management
let state = {
  platform: null,
  platformId: null,
  isLoggedInToGallery: false,
  isLoggedInToPlatform: false,
  isPlatformConnected: false
};

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

// Find suitable container for our button
function findContainer(platform) {
  const selectors = platform.selectors;
  
  // Try each selector in order of preference
  for (const key in selectors) {
    const element = document.querySelector(selectors[key]);
    if (element) {
      console.log(`MainGallery: Found container using selector "${key}": ${selectors[key]}`);
      return element;
    }
  }
  
  // If no specific container found, try some general containers
  const generalSelectors = [
    'header', 
    'nav', 
    '.navbar', 
    '.toolbar', 
    '.app-bar',
    '.controls',
    'main',
    '.content',
    '.container'
  ];
  
  for (const selector of generalSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      console.log(`MainGallery: Found container using general selector: ${selector}`);
      return element;
    }
  }
  
  // Last resort: body
  console.log('MainGallery: No specific container found, using body');
  return document.body;
}

// Create the Main Gallery button
function createButton({ action = 'add', isVisible = true, disabled = false, platformLoggedIn = true }) {
  // Remove existing button if present
  if (addedElements.button) {
    addedElements.button.remove();
    addedElements.button = null;
  }
  
  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'main-gallery-button-container';
  buttonContainer.style.position = 'fixed';
  buttonContainer.style.bottom = '20px';
  buttonContainer.style.right = '20px';
  buttonContainer.style.zIndex = UI.zIndex;
  buttonContainer.style.display = isVisible ? 'block' : 'none';
  
  // Create the actual button
  const button = document.createElement('button');
  button.className = 'main-gallery-button';
  button.disabled = disabled;
  
  // Determine button text and style based on action
  let buttonText, buttonStyle;
  
  if (!platformLoggedIn) {
    // User needs to log in to platform first
    buttonText = `Please log in to ${state.platform?.name || 'platform'} first`;
    buttonStyle = `
      background-color: #f0f0f0;
      color: #6b7280;
      cursor: not-allowed;
    `;
    button.disabled = true;
  } else if (action === 'add') {
    // Default: "Add to Main Gallery"
    buttonText = 'Add to Main Gallery';
    buttonStyle = `
      background-color: ${UI.colors.primary};
      color: ${UI.colors.text};
      cursor: pointer;
    `;
  } else if (action === 'go') {
    // "Go to Main Gallery"
    buttonText = 'Go to Main Gallery';
    buttonStyle = `
      background-color: #16a34a;
      color: ${UI.colors.text};
      cursor: pointer;
    `;
  } else if (action === 'login') {
    // "Login to Main Gallery"
    buttonText = 'Login to Main Gallery';
    buttonStyle = `
      background-color: ${UI.colors.primary};
      color: ${UI.colors.text};
      cursor: pointer;
    `;
  }
  
  button.innerHTML = buttonText;
  
  // Apply styles
  button.style.cssText = `
    ${buttonStyle}
    padding: 8px 16px;
    border-radius: 20px;
    border: none;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: ${UI.colors.shadow};
    transition: ${UI.transitions};
    outline: none;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 160px;
    height: 40px;
    white-space: nowrap;
  `;
  
  // Add hover effect
  button.addEventListener('mouseover', () => {
    if (!button.disabled) {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
      
      if (action === 'add') {
        button.style.backgroundColor = UI.colors.hover;
      } else if (action === 'go') {
        button.style.backgroundColor = '#15803d';
      } else if (action === 'login') {
        button.style.backgroundColor = UI.colors.hover;
      }
    }
  });
  
  button.addEventListener('mouseout', () => {
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = UI.colors.shadow;
    
    if (action === 'add') {
      button.style.backgroundColor = UI.colors.primary;
    } else if (action === 'go') {
      button.style.backgroundColor = '#16a34a';
    } else if (action === 'login') {
      button.style.backgroundColor = UI.colors.primary;
    }
  });
  
  // Add click handler based on action
  button.addEventListener('click', async () => {
    if (button.disabled) return;
    
    if (action === 'add') {
      // Send message to add current content to gallery
      handleAddToGallery();
    } else if (action === 'go') {
      // Send message to open gallery
      chrome.runtime.sendMessage({ action: 'openGallery' });
    } else if (action === 'login') {
      // Send message to open auth page
      chrome.runtime.sendMessage({ 
        action: 'openAuthPage',
        redirectUrl: window.location.href
      });
    }
  });
  
  buttonContainer.appendChild(button);
  document.body.appendChild(buttonContainer);
  
  // Store reference to the button
  addedElements.button = buttonContainer;
  
  return buttonContainer;
}

// Handle adding to gallery
async function handleAddToGallery() {
  // Get current content from the page
  // This is a placeholder - in a real extension, we would get the actual content
  const data = {
    platformId: state.platformId,
    imageUrl: 'https://placeholder.com/image.jpg', // Placeholder
    prompt: 'Placeholder prompt',
    timestamp: new Date().toISOString()
  };
  
  // Send message to background script
  chrome.runtime.sendMessage({
    action: 'addToGallery',
    data: data
  }, function(response) {
    if (response && response.success) {
      console.log('Successfully added to gallery:', response);
      // Update UI to show success
      updateUI();
    } else {
      console.error('Failed to add to gallery:', response?.error || 'Unknown error');
    }
  });
}

// Create onboarding tooltip
function createOnboardingTooltip() {
  // If already exists, remove it first
  if (addedElements.onboarding) {
    addedElements.onboarding.remove();
    addedElements.onboarding = null;
  }
  
  // Check if we already showed onboarding and user has closed it
  chrome.storage.local.get(['onboarding_shown'], result => {
    if (result.onboarding_shown) {
      console.log('MainGallery: Onboarding tooltip already shown and closed by user');
      return;
    }
    
    // Also check if user is already logged in - if so, don't show onboarding
    isLoggedInToGallery().then(loggedIn => {
      if (loggedIn) {
        console.log('MainGallery: User already logged in, not showing onboarding');
        // Make sure we mark it as shown to not show again
        chrome.storage.local.set({ onboarding_shown: true });
        return;
      }
      
      // Create the tooltip element
      const onboarding = document.createElement('div');
      onboarding.className = 'main-gallery-onboarding';
      
      onboarding.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 20px;
        width: 300px;
        background-color: ${UI.colors.bgLight};
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        padding: 16px;
        z-index: ${UI.zIndex};
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: ${UI.colors.textDark};
        transition: ${UI.transitions};
        opacity: 0;
        transform: translateY(20px);
      `;
      
      const onboardingHeader = document.createElement('div');
      onboardingHeader.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      `;
      
      const title = document.createElement('h3');
      title.style.cssText = `
        font-size: 16px;
        font-weight: 600;
        margin: 0;
      `;
      title.textContent = 'Welcome to Main Gallery!';
      
      const closeButton = document.createElement('button');
      closeButton.style.cssText = `
        background: none;
        border: none;
        cursor: pointer;
        font-size: 18px;
        color: #6b7280;
      `;
      closeButton.innerHTML = '&times;';
      
      onboardingHeader.appendChild(title);
      onboardingHeader.appendChild(closeButton);
      
      const content = document.createElement('p');
      content.style.cssText = `
        font-size: 14px;
        line-height: 1.5;
        margin: 0 0 12px;
      `;
      content.textContent = `To collect your ${state.platform?.name || 'AI'} creations, login to Main Gallery. You'll only need to do this once.`;
      
      const actionButton = document.createElement('button');
      actionButton.style.cssText = `
        background-color: ${UI.colors.primary};
        color: ${UI.colors.text};
        border: none;
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        width: 100%;
        transition: ${UI.transitions};
      `;
      actionButton.textContent = 'Login to Main Gallery';
      
      onboarding.appendChild(onboardingHeader);
      onboarding.appendChild(content);
      onboarding.appendChild(actionButton);
      
      document.body.appendChild(onboarding);
      
      // Animate in
      setTimeout(() => {
        onboarding.style.opacity = '1';
        onboarding.style.transform = 'translateY(0)';
      }, 100);
      
      // Add event listeners
      actionButton.addEventListener('click', () => {
        // Send message to open auth page
        chrome.runtime.sendMessage({ 
          action: 'openAuthPage',
          redirectUrl: window.location.href
        });
        
        // Remember that the user saw this
        chrome.storage.local.set({ onboarding_shown: true });
        
        // Remove tooltip with animation
        onboarding.style.opacity = '0';
        onboarding.style.transform = 'translateY(20px)';
        setTimeout(() => onboarding.remove(), 300);
      });
      
      closeButton.addEventListener('click', () => {
        onboarding.classList.remove('show');
        setTimeout(() => onboarding.remove(), 300);
        
        // Remember that the user closed it
        chrome.storage.local.set({ onboarding_shown: true });
      });
      
      // Store reference
      addedElements.onboarding = onboarding;
      
      // Auto-hide after 15 seconds if user doesn't interact
      setTimeout(() => {
        if (addedElements.onboarding) {
          addedElements.onboarding.style.opacity = '0';
          addedElements.onboarding.style.transform = 'translateY(20px)';
          setTimeout(() => {
            if (addedElements.onboarding) {
              addedElements.onboarding.remove();
              addedElements.onboarding = null;
            }
          }, 300);
        }
      }, 15000);
    });
  });
}

// Update the UI based on current state
async function updateUI() {
  console.log('MainGallery: Updating UI with state:', state);
  
  // Check login and platform connection status
  state.isLoggedInToGallery = await isLoggedInToGallery();
  state.isPlatformConnected = state.platformId ? await isPlatformConnected(state.platformId) : false;
  
  // Define button action based on state
  let buttonAction, isVisible, isDisabled;
  
  if (!state.isLoggedInToPlatform) {
    // User needs to log in to platform first
    buttonAction = 'add';
    isVisible = true;
    isDisabled = true;
  } else if (!state.isLoggedInToGallery) {
    // User needs to log in to Main Gallery
    buttonAction = 'login';
    isVisible = true;
    isDisabled = false;
    
    // Show onboarding tooltip if first time
    createOnboardingTooltip();
  } else if (state.isPlatformConnected) {
    // User is connected, offer to go to gallery
    buttonAction = 'go';
    isVisible = true;
    isDisabled = false;
  } else {
    // Default: offer to add to gallery
    buttonAction = 'add';
    isVisible = true;
    isDisabled = false;
  }
  
  // Create or update button
  createButton({ 
    action: buttonAction, 
    isVisible: isVisible, 
    disabled: isDisabled,
    platformLoggedIn: state.isLoggedInToPlatform
  });
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
    // Check if our button has been removed
    if (addedElements.button && !document.contains(addedElements.button)) {
      console.log('MainGallery: Button was removed, re-adding');
      addedElements.button = null;
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
    attributes: false,
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
  }
  
  return true;
});

// Initialize when the page is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
