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
const userEmailElement = document.getElementById('user-email');

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
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true
      }
    });
    
    console.log('Supabase client created in popup');
  }
} catch (err) {
  console.error('Error creating Supabase client:', err);
}

// Enhanced localStorage session check
function checkLocalStorageAuth() {
  try {
    const tokenStr = localStorage.getItem('main_gallery_auth_token');
    if (tokenStr) {
      const token = JSON.parse(tokenStr);
      
      // Check if token is valid and not expired (24 hours validity)
      if (token && (Date.now() - token.timestamp < 24 * 60 * 60 * 1000)) {
        console.log('Valid auth token found in localStorage');
        
        // Sync to Chrome storage
        chrome.storage.sync.set({
          'main_gallery_auth_token': token,
          'main_gallery_user_email': localStorage.getItem('main_gallery_user_email') || 'User'
        }, () => {
          console.log('Synced web session to extension storage');
        });
        
        return true;
      } else {
        console.log('Expired token found in localStorage');
        localStorage.removeItem('main_gallery_auth_token');
        localStorage.removeItem('main_gallery_user_email');
        return false;
      }
    }
  } catch (error) {
    console.error('Error checking localStorage:', error);
  }
  
  return false;
}

// Check Supabase session if client is available
async function checkSupabaseSession() {
  if (supabaseClient) {
    try {
      console.log('Checking Supabase session');
      const { data: { session } } = await supabaseClient.auth.getSession();
      
      if (session) {
        console.log('Valid Supabase session found:', session.user.email);
        
        // Sync to storage
        const tokenData = {
          access_token: session.access_token,
          refresh_token: session.refresh_token || '',
          timestamp: Date.now()
        };
        
        // Store in chrome storage
        chrome.storage.sync.set({
          'main_gallery_auth_token': tokenData,
          'main_gallery_user_email': session.user.email || 'User'
        }, () => {
          console.log('Synced Supabase session to extension storage');
        });
        
        // Also store in localStorage
        try {
          localStorage.setItem('main_gallery_auth_token', JSON.stringify(tokenData));
          localStorage.setItem('main_gallery_user_email', session.user.email || 'User');
        } catch (err) {
          console.error('Error storing in localStorage:', err);
        }
        
        return true;
      }
    } catch (err) {
      console.error('Error checking Supabase session:', err);
    }
  }
  
  return false;
}

// Improved isLoggedIn check to handle both storage mechanisms
async function isLoggedIn() {
  // First try Supabase session
  if (await checkSupabaseSession()) {
    return true;
  }
  
  // Then check localStorage 
  if (checkLocalStorageAuth()) {
    return true;
  }
  
  // Finally check extension storage
  return new Promise(resolve => {
    chrome.storage.sync.get(['main_gallery_auth_token'], result => {
      const token = result.main_gallery_auth_token;
      
      // Check if token exists and is not too old (24 hours validity)
      if (token && (Date.now() - token.timestamp < 24 * 60 * 60 * 1000)) {
        console.log('Valid token found in extension storage');
        
        // Also try to sync to localStorage for web access
        try {
          localStorage.setItem('main_gallery_auth_token', JSON.stringify(token));
          
          // Also get user email if available
          chrome.storage.sync.get(['main_gallery_user_email'], emailResult => {
            if (emailResult.main_gallery_user_email) {
              localStorage.setItem('main_gallery_user_email', emailResult.main_gallery_user_email);
            }
          });
        } catch (err) {
          console.error('Error syncing to localStorage:', err);
        }
        
        resolve(true);
      } else {
        // Token doesn't exist or is expired
        if (token) {
          // Clear expired token
          console.log('Expired token found in extension storage');
          chrome.storage.sync.remove(['main_gallery_auth_token', 'main_gallery_user_email']);
        }
        resolve(false);
      }
    });
  });
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
  
  // Then check localStorage for web session
  try {
    const userEmail = localStorage.getItem('main_gallery_user_email');
    if (userEmail) {
      return userEmail;
    }
  } catch (error) {
    console.error('Error getting email from localStorage:', error);
  }
  
  // Finally check extension storage
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

// Enhanced auth check with logging for debugging
async function checkAuthAndRedirect() {
  try {
    showState(states.authLoading); // Show loading state while checking
    console.log('Checking authentication status...');
    
    // Check authentication in all storage mechanisms
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

// Open auth page with email login
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

// Open auth with Google provider
function openAuthWithProvider(provider) {
  try {
    showState(states.authLoading);
    console.log(`Opening ${provider} login...`);
    showToast(`Opening ${provider} login...`, 'info');
    
    chrome.runtime.sendMessage({
      action: 'openAuthWithProvider',
      provider: provider
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
    // Also remove from localStorage
    try {
      localStorage.removeItem('main_gallery_auth_token');
      localStorage.removeItem('main_gallery_user_email');
    } catch (err) {
      console.error('Error clearing localStorage:', err);
    }
    
    showState(states.notLoggedIn);
    showToast('You have been logged out', 'info');
  });
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
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'updateUI') {
    checkAuthAndRedirect();
  } else if (message.action === 'midjourneyImagesExtracted') {
    showToast(`${message.count} new images extracted from Midjourney`, 'info');
  }
});

// Add periodic auth check for better synchronization
setInterval(() => {
  console.log('Running periodic auth check');
  checkAuthAndRedirect();
}, 30000); // Check every 30 seconds
