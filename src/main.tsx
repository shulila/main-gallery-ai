
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { handleOAuthRedirect, handleOAuthTokenFromHash } from './utils/authTokenHandler';

// Special handling for auth callbacks early in the app initialization
const handleEarlyAuthToken = async () => {
  // Check for auth callback paths with hash fragments
  const isAuthCallback = window.location.pathname === '/auth/callback' || 
                        window.location.pathname.includes('/callback') ||
                        window.location.hash.includes('access_token') || 
                        window.location.search.includes('access_token');
                        
  if (isAuthCallback) {
    console.log('Auth callback detected, attempting early token handling');
    
    // Check for incorrect domain first
    const currentURL = window.location.href;
    if (
      currentURL.includes("preview-main-gallery-ai.lovable.app/auth/callback") &&
      (currentURL.includes("#access_token=") || currentURL.includes("?access_token="))
    ) {
      console.warn("Detected auth callback on incorrect domain, redirecting to production domain");
      const correctedURL = currentURL.replace(
        "preview-main-gallery-ai.lovable.app",
        "main-gallery-hub.lovable.app"
      );
      console.log("Redirecting to:", correctedURL);
      window.location.href = correctedURL;
      return;
    }
    
    // Try hash extraction first (faster)
    const handled = handleOAuthTokenFromHash(window.location.href);
    if (handled) {
      console.log('Successfully handled token via direct hash extraction');
      return;
    }
    
    // Try Supabase method otherwise
    try {
      const success = await handleOAuthRedirect();
      if (success) {
        console.log('Successfully handled OAuth redirect');
      }
    } catch (err) {
      console.error('Error in early auth token handling:', err);
    }
  }
};

// Try to handle tokens early
handleEarlyAuthToken();

// Make sure the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById("root");
  if (root) {
    createRoot(root).render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    
    // Apply SPA routing fix for direct URL access
    if (window.location.pathname !== '/' && !window.location.pathname.includes('.')) {
      console.log('SPA route detected on direct load:', window.location.pathname);
      
      // Special handling for auth callbacks
      if (window.location.pathname.includes('/auth/callback') || 
          window.location.pathname.includes('/callback') ||
          window.location.hash.includes('access_token') || 
          window.location.search.includes('access_token')) {
        
        console.log('Auth callback detected in main.tsx DOMContentLoaded');
        
        // First try direct hash extraction
        const handled = handleOAuthTokenFromHash(window.location.href);
        if (handled) {
          console.log('Successfully handled token via direct hash extraction in main.tsx');
          return;
        }
        
        // Then try the Supabase method
        handleOAuthRedirect().then(success => {
          if (success) {
            console.log('Successfully handled auth token in main.tsx DOMContentLoaded');
          }
        }).catch(err => {
          console.error('Error handling auth token in main.tsx:', err);
        });
      }
    }
  }
});
