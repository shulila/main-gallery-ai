// Brand configuration to align with the main app
const BRAND = {
  name: "MainGallery.AI",
  urls: {
    baseUrl: "https://main-gallery-hub.lovable.app",
    auth: "/auth",
    gallery: "/gallery"
  }
};

// Gallery URL with base from brand config
const GALLERY_URL = `${BRAND.urls.baseUrl}${BRAND.urls.gallery}`;

// DOM elements
const states = {
  notLoggedIn: document.getElementById('not-logged-in'),
  authLoading: document.getElementById('auth-loading'),
  loggedIn: document.getElementById('logged-in')
};

const loginBtn = document.getElementById('login-btn');
const googleLoginBtn = document.getElementById('google-login-btn');
const logoutBtn = document.getElementById('logout-btn');
const openGalleryBtn = document.getElementById('open-gallery-btn');
const scanTabsBtn = document.getElementById('scan-tabs-btn');
const scanTabsBtnPublic = document.getElementById('scan-tabs-btn-public');
const scanResults = document.getElementById('scan-results');
const commonScanResults = document.getElementById('common-scan-results');
const resultsGrid = document.getElementById('results-grid');
const commonResultsGrid = document.getElementById('common-results-grid');
const userEmailElement = document.getElementById('user-email');
const scanActions = document.getElementById('scan-actions');
const copyAllPromptsBtn = document.getElementById('copy-all-prompts-btn');
const clearResultsBtn = document.getElementById('clear-results-btn');
const syncToGalleryBtn = document.getElementById('sync-to-gallery-btn');
const viewGalleryBtn = document.getElementById('view-gallery-btn');
const syncSuccessMessage = document.getElementById('sync-success-message');
const syncCountElement = document.getElementById('sync-count');

// Helper functions
function hideAllStates() {
  Object.values(states).forEach(state => state.classList.add('hidden'));
}

function showState(state) {
  hideAllStates();
  state.classList.remove('hidden');
}

// Create Supabase client if possible
let supabaseClient = null;
try {
  if (typeof createClient !== 'undefined') {
    const SUPABASE_URL = 'https://ovhriawcqvcpagcaidlb.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92aHJpYXdjcXZjcGFnY2FpZGxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2MDQxNzMsImV4cCI6MjA1ODE4MDE3M30.Hz5AA2WF31w187GkEOtKJCpoEi6JDcrdZ-dDv6d8Z7U';
    
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
    
    console.log('Supabase client created in popup');
  }
} catch (err) {
  console.error('Error creating Supabase client:', err);
}

// Improved isLoggedIn check with token validation
async function isLoggedIn() {
  // First try Supabase session
  if (await checkSupabaseSession()) {
    return true;
  }
  
  // Check extension storage with validation
  return new Promise(resolve => {
    chrome.storage.sync.get(['main_gallery_auth_token'], result => {
      const token = result.main_gallery_auth_token;
      
      // Check if token exists and is not expired
      if (token) {
        const hasExpiry = token.expires_at !== undefined;
        const isExpired = hasExpiry && Date.now() > token.expires_at;
        
        if (!isExpired) {
          console.log('Valid token found in extension storage');
          resolve(true);
          return;
        } 
        
        // Token is expired, clean it up
        console.log('Expired token found in extension storage');
        chrome.storage.sync.remove(['main_gallery_auth_token', 'main_gallery_user_email']);
      }
      
      resolve(false);
    });
  });
}

// Check Supabase session if client is available
async function checkSupabaseSession() {
  if (supabaseClient) {
    try {
      console.log('Checking Supabase session');
      const { data: { session } } = await supabaseClient.auth.getSession();
      
      if (session) {
        console.log('Valid Supabase session found:', session.user.email);
        
        // Sync to storage with expiry time (24 hours from now)
        const tokenData = {
          access_token: session.access_token,
          refresh_token: session.refresh_token || '',
          timestamp: Date.now(),
          expires_at: Date.now() + (24 * 60 * 60 * 1000)
        };
        
        // Store in chrome storage
        chrome.storage.sync.set({
          'main_gallery_auth_token': tokenData,
          'main_gallery_user_email': session.user.email || 'User'
        }, () => {
          console.log('Synced Supabase session to extension storage');
        });
        
        return true;
      }
    } catch (err) {
      console.error('Error checking Supabase session:', err);
    }
  }
  
  return false;
}

// Get user email from any available sources
async function getUserEmail() {
  // First try Supabase
  if (supabaseClient) {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.user?.email) {
        return session.user.email;
      }
    } catch (err) {
      console.error('Error getting email from Supabase:', err);
    }
  }
  
  // Check extension storage
  return new Promise(resolve => {
    chrome.storage.sync.get(['main_gallery_user_email'], result => {
      resolve(result.main_gallery_user_email || 'User');
    });
  });
}

// Show toast notification
function showToast(message, type = 'info') {
  // Remove any existing toasts
  const existingToast = document.querySelector('.main-gallery-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `main-gallery-toast ${type}`;
  toast.textContent = message;
  
  // Add to document
  document.body.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Auto hide after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Enhanced auth check with token validation
async function checkAuthAndRedirect() {
  try {
    showState(states.authLoading); // Show loading state while checking
    console.log('Checking authentication status with validation...');
    
    // Check authentication in all storage mechanisms with token validation
    const loggedIn = await isLoggedIn();
    
    if (loggedIn) {
      console.log('User is logged in, showing logged-in state');
      
      // Get user email to display if available
      const userEmail = await getUserEmail();
      console.log('User email:', userEmail);
      
      if (userEmail && userEmailElement) {
        userEmailElement.textContent = userEmail;
      }
      
      showState(states.loggedIn);
      return true;
    }
    
    console.log('User is not logged in, showing login options');
    showState(states.notLoggedIn);
    return false;
  } catch (error) {
    console.error('Error checking auth status:', error);
    showState(states.notLoggedIn);
    return false;
  }
}

// Open gallery in new tab or focus existing tab
function openGallery() {
  try {
    console.log('Opening gallery at', GALLERY_URL);
    
    // Send message to background script to handle opening gallery
    chrome.runtime.sendMessage({ action: 'openGallery' });
    
    // Close popup after navigation request
    window.close();
  } catch (error) {
    console.error('Error opening gallery:', error);
    showToast('Could not open gallery. Please try again.', 'error');
  }
}

// Open auth page with email login - make sure to use the same login page for all flows
function openAuthPage() {
  try {
    showState(states.authLoading);
    console.log('Opening auth page with email/password login');
    showToast('Opening login page...', 'info');
    
    chrome.runtime.sendMessage({ 
      action: 'openAuthPage',
      from: 'extension'
    });
    
    // Close popup after a short delay
    setTimeout(() => window.close(), 300);
  } catch (error) {
    console.error('Error opening auth page:', error);
    showToast('Could not open login page. Please try again.', 'error');
    showState(states.notLoggedIn);
  }
}

// Open auth with Google provider - make sure this goes to the same login page as email login
function openAuthWithProvider(provider) {
  try {
    showState(states.authLoading);
    console.log(`Opening ${provider} login...`);
    showToast(`Opening ${provider} login...`, 'info');
    
    // Direct to auth page with from=extension to ensure consistent flow
    chrome.runtime.sendMessage({
      action: 'openAuthPage',
      from: 'extension'
    });
    
    // Close popup after a short delay
    setTimeout(() => window.close(), 300);
  } catch (error) {
    console.error(`Error opening ${provider} auth:`, error);
    showToast(`Could not open ${provider} login. Please try again.`, 'error');
    showState(states.notLoggedIn);
  }
}

// Log out the user
function logout() {
  chrome.runtime.sendMessage({ action: 'logout' }, response => {
    showState(states.notLoggedIn);
    showToast('You have been logged out', 'info');
  });
}

// Scan all open tabs for images
function scanOpenTabs() {
  console.log('🔍 Starting scan of all open tabs...');
  showToast('Scanning open tabs for images...', 'info');
  
  // Determine which results grid to use based on login state
  const isUserLoggedIn = document.getElementById('logged-in').classList.contains('hidden') === false;
  const targetResultsGrid = isUserLoggedIn ? resultsGrid : commonResultsGrid;
  const targetResultsContainer = isUserLoggedIn ? scanResults : commonScanResults;
  
  // Clear any previous results
  if (targetResultsGrid) {
    targetResultsGrid.innerHTML = '';
    targetResultsContainer.classList.add('hidden');
  }
  
  // Show loading indicator
  const loadingEl = document.createElement('div');
  loadingEl.className = 'scan-loading';
  loadingEl.innerHTML = `
    <div class="loading-spinner"></div>
    <p>Scanning tabs for images...</p>
  `;
  targetResultsGrid.appendChild(loadingEl);
  targetResultsContainer.classList.remove('hidden');
  
  // Request background script to scan tabs
  chrome.runtime.sendMessage({ action: 'scanTabsEnhanced' }, (response) => {
    console.log('Scan request sent, waiting for images...');
  });
}

// Copy all prompts from the results grid
function copyAllPrompts() {
  const isUserLoggedIn = document.getElementById('logged-in').classList.contains('hidden') === false;
  const targetResultsGrid = isUserLoggedIn ? resultsGrid : commonResultsGrid;
  const prompts = [];
  
  // Get all grid items
  const gridItems = targetResultsGrid.querySelectorAll('.grid-item');
  gridItems.forEach(item => {
    const tooltip = item.querySelector('.tooltip');
    if (tooltip && tooltip.textContent) {
      prompts.push(tooltip.textContent);
    }
  });
  
  if (prompts.length > 0) {
    // Copy to clipboard
    const text = prompts.join('\n\n');
    navigator.clipboard.writeText(text).then(() => {
      showToast(`Copied ${prompts.length} prompts to clipboard`, 'info');
    }).catch(err => {
      console.error('Error copying prompts:', err);
      showToast('Failed to copy prompts', 'error');
    });
  } else {
    showToast('No prompts to copy', 'info');
  }
}

// Clear current results
function clearResults() {
  const isUserLoggedIn = document.getElementById('logged-in').classList.contains('hidden') === false;
  const targetResultsGrid = isUserLoggedIn ? resultsGrid : commonResultsGrid;
  const targetResultsContainer = isUserLoggedIn ? scanResults : commonScanResults;
  
  targetResultsGrid.innerHTML = '';
  targetResultsContainer.classList.add('hidden');
  
  if (scanActions) {
    scanActions.classList.add('hidden');
  }
  
  showToast('Results cleared', 'info');
}

// Render images in the popup grid
function renderImageGrid(images) {
  console.log(`Rendering ${images.length} images in grid`);
  
  // Determine which results grid to use based on login state
  const isUserLoggedIn = document.getElementById('logged-in').classList.contains('hidden') === false;
  const targetResultsGrid = isUserLoggedIn ? resultsGrid : commonResultsGrid;
  const targetResultsContainer = isUserLoggedIn ? scanResults : commonScanResults;
  
  // Remove loading indicator
  targetResultsGrid.innerHTML = '';
  
  if (images.length === 0) {
    targetResultsGrid.innerHTML = '<p class="no-images">No images found in open tabs</p>';
    return;
  }
  
  // Create grid items for each image
  images.forEach(image => {
    try {
      // Create grid item
      const gridItem = document.createElement('div');
      gridItem.className = 'grid-item';
      gridItem.dataset.tabUrl = image.tabUrl || image.sourceUrl;
      
      // Create tooltip wrapper
      const tooltipWrapper = document.createElement('div');
      tooltipWrapper.className = 'tooltip-wrapper';
      
      // Create image thumbnail
      const img = document.createElement('img');
      img.src = image.src || image.url;
      img.className = 'thumbnail';
      img.alt = image.alt || 'Image';
      img.loading = 'lazy';
      img.dataset.tabUrl = image.tabUrl || image.sourceUrl;
      img.dataset.sourceUrl = image.sourceUrl || image.tabUrl;
      
      // Create tooltip
      const tooltip = document.createElement('span');
      tooltip.className = 'tooltip';
      tooltip.textContent = image.prompt || image.title || image.alt || image.domain || 'Image';
      
      // Create info badge
      const badge = document.createElement('div');
      badge.className = 'domain-badge';
      badge.textContent = image.platformName || image.platform || image.domain || '';
      
      // Create action buttons
      const actions = document.createElement('div');
      actions.className = 'image-actions';
      
      // Create copy prompt button if prompt exists
      if (image.prompt) {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'action-btn copy-btn';
        copyBtn.textContent = '📝';
        copyBtn.title = 'Copy Prompt';
        copyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(image.prompt).then(() => {
            showToast('Prompt copied to clipboard', 'info');
          }).catch(err => {
            showToast('Failed to copy prompt', 'error');
          });
        });
        actions.appendChild(copyBtn);
      }
      
      // Create open source button
      const openBtn = document.createElement('button');
      openBtn.className = 'action-btn open-btn';
      openBtn.textContent = '🌐';
      openBtn.title = 'Open Source';
      openBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        chrome.tabs.create({ url: image.tabUrl || image.sourceUrl });
      });
      actions.appendChild(openBtn);
      
      // Assemble the components
      tooltipWrapper.appendChild(img);
      tooltipWrapper.appendChild(tooltip);
      gridItem.appendChild(tooltipWrapper);
      gridItem.appendChild(badge);
      gridItem.appendChild(actions);
      
      // Add to results grid
      targetResultsGrid.appendChild(gridItem);
    } catch (err) {
      console.error('Error rendering image:', err);
    }
  });
  
  // Show results and update header
  targetResultsContainer.classList.remove('hidden');
  const resultsHeader = targetResultsContainer.querySelector('.results-header');
  if (resultsHeader) {
    resultsHeader.textContent = `Images from Open Tabs (${images.length})`;
  }
  
  // Show action buttons
  if (scanActions && !scanActions.classList.contains('hidden')) {
    console.log('Scan actions already visible');
  } else if (scanActions) {
    console.log('Making scan actions visible');
    scanActions.classList.remove('hidden');
  } else {
    console.log('Scan actions element not found');
  }
}

// Function to sync images to the main gallery
function syncImagesToGallery() {
  console.log('Starting sync to gallery process');
  const isUserLoggedIn = document.getElementById('logged-in').classList.contains('hidden') === false;
  const targetResultsGrid = isUserLoggedIn ? resultsGrid : commonResultsGrid;
  const syncSuccessMessage = document.getElementById('sync-success-message');
  const syncCountElement = document.getElementById('sync-count');
  
  // Show loading state
  showToast('Syncing images to gallery...', 'info');
  
  // Get all grid items
  const gridItems = targetResultsGrid.querySelectorAll('.grid-item');
  if (!gridItems.length) {
    showToast('No images to sync', 'info');
    return;
  }
  
  // Collect image data
  const images = Array.from(gridItems).map(item => {
    const img = item.querySelector('img');
    const tooltip = item.querySelector('.tooltip');
    const badge = item.querySelector('.domain-badge');
    
    return {
      src: img?.src,
      url: img?.src, // Duplicate for compatibility
      alt: img?.alt,
      title: img?.title,
      prompt: tooltip?.textContent,
      platform: badge?.textContent,
      platformName: badge?.textContent,
      tabUrl: img?.dataset.tabUrl || item.dataset.tabUrl,
      sourceUrl: img?.dataset.sourceUrl || item.dataset.sourceUrl,
      timestamp: Date.now(),
      type: 'image' // Explicitly set type
    };
  }).filter(img => img.src || img.url);
  
  console.log(`Preparing to sync ${images.length} images to gallery`);
  console.log('Sample image data:', images[0]);
  
  // Find a tab with our web app open, or open a new one
  chrome.tabs.query({ url: `${BRAND.urls.baseUrl}/*` }, (tabs) => {
    // Sync function that sends data to the web app
    const sendToWebApp = (tab) => {
      console.log('Sending images to web app tab:', tab.id);
      
      // Use chrome.tabs.sendMessage to send images to content script in the web app tab
      chrome.tabs.sendMessage(tab.id, {
        action: 'syncImagesToGallery',
        images: images
      }, response => {
        if (chrome.runtime.lastError) {
          console.error('Error sending images to web app:', chrome.runtime.lastError);
          
          // Try direct postMessage approach
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: (images) => {
              console.log(`Content script injected, posting ${images.length} images to window`);
              window.postMessage({ 
                type: 'GALLERY_IMAGES', 
                images: images,
                source: 'MAIN_GALLERY_EXTENSION'
              }, '*');
            },
            args: [images]
          }).then(() => {
            console.log('Script executed to send images via postMessage');
            showSyncSuccess(images.length);
          }).catch(err => {
            console.error('Failed to inject script:', err);
            showToast('Error syncing to gallery. Try opening the gallery first.', 'error');
          });
        } else if (response && response.success) {
          console.log('Images successfully sent to web app');
          showSyncSuccess(images.length);
        }
      });
    };
    
    // Show sync success message and update UI
    const showSyncSuccess = (count) => {
      if (syncSuccessMessage && syncCountElement) {
        syncCountElement.textContent = count.toString();
        syncSuccessMessage.classList.remove('hidden');
        
        // Hide scan results
        if (targetResultsGrid) {
          targetResultsGrid.innerHTML = '';
        }
        
        // Hide scan actions
        if (scanActions) {
          scanActions.classList.add('hidden');
        }
      }
      
      showToast(`✅ ${count} images synced to MainGallery`, 'success');
    };
    
    // If we found a tab with our web app
    if (tabs && tabs.length > 0) {
      // Focus the tab
      chrome.tabs.update(tabs[0].id, { active: true }, () => {
        // Send data to it
        sendToWebApp(tabs[0]);
      });
    } else {
      // Open a new gallery tab
      chrome.tabs.create({ url: GALLERY_URL }, (newTab) => {
        console.log('New gallery tab created, waiting for load...');
        
        // Store images in session storage for the gallery to retrieve
        try {
          sessionStorage.setItem('maingallery_sync_images', JSON.stringify(images));
        } catch (err) {
          console.error('Failed to store images in session storage:', err);
        }
        
        // Wait for tab to load before sending data
        chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, tab) {
          if (tabId === newTab.id && changeInfo.status === 'complete') {
            // Remove listener to avoid multiple calls
            chrome.tabs.onUpdated.removeListener(listener);
            
            // Give the app a moment to initialize
            setTimeout(() => {
              sendToWebApp(tab);
            }, 2000);
          }
        });
      });
    }
  });
}

// Function to open gallery in new tab
function viewGallery() {
  openGallery();
  window.close(); // Close the popup
}

// Check for auth status immediately when popup opens
document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup loaded, checking auth status');
  checkAuthAndRedirect();
  
  // Set up event listeners for buttons
  if (loginBtn) {
    loginBtn.addEventListener('click', openAuthPage);
    console.log('Login button listener set up');
  }
  
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', () => {
      console.log('Google login button clicked');
      openAuthWithProvider('google');
    });
    console.log('Google login button listener set up');
  }
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
  
  if (openGalleryBtn) {
    openGalleryBtn.addEventListener('click', openGallery);
  }
  
  // Set up scan tabs buttons (both logged in and public versions)
  if (scanTabsBtn) {
    scanTabsBtn.addEventListener('click', scanOpenTabs);
    console.log('Scan tabs button listener set up (logged in)');
  }
  
  if (scanTabsBtnPublic) {
    scanTabsBtnPublic.addEventListener('click', scanOpenTabs);
    console.log('Scan tabs button listener set up (public)');
  }
  
  // Set up action buttons
  if (copyAllPromptsBtn) {
    copyAllPromptsBtn.addEventListener('click', copyAllPrompts);
  }
  
  if (clearResultsBtn) {
    clearResultsBtn.addEventListener('click', clearResults);
  }
  
  // Setup sync to gallery button
  if (syncToGalleryBtn) {
    syncToGalleryBtn.addEventListener('click', syncImagesToGallery);
    console.log('Sync to gallery button listener set up');
  }
  
  // Setup view gallery button
  if (viewGalleryBtn) {
    viewGalleryBtn.addEventListener('click', viewGallery);
    console.log('View gallery button listener set up');
  }
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'updateUI') {
    checkAuthAndRedirect();
  } else if (message.action === 'midjourneyImagesExtracted') {
    showToast(`${message.count} new images extracted from Midjourney`, 'info');
  } else if (message.action === 'scanTabsResult') {
    // Handle results from tab scanning
    if (message.images && Array.isArray(message.images)) {
      console.log(`Received ${message.images.length} images from background`);
      console.log('First image:', message.images.length > 0 ? JSON.stringify(message.images[0]) : 'No images');
      renderImageGrid(message.images);
      showToast(`Found ${message.images.length} images in ${message.tabCount} tabs`, 'success');
    } else {
      console.error('Invalid image data received:', message);
      showToast('Error processing images from tabs', 'error');
    }
  } else if (message.action === 'galleryImagesReceived') {
    console.log(`Web app confirmed receipt of ${message.count} images`);
    showToast(`✅ ${message.count} images received by gallery`, 'success');
  }
});
