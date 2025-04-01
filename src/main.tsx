
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { handleOAuthRedirect } from './utils/authTokenHandler';

// Special handling for auth callbacks early in the app initialization
const handleEarlyAuthToken = async () => {
  // Check for auth callback paths with hash fragments
  if ((window.location.pathname === '/auth/callback' || 
       window.location.pathname.startsWith('/auth')) && 
      window.location.hash && 
      window.location.hash.includes('access_token')) {
    
    console.log('Auth callback detected with token fragment, attempting early token handling');
    try {
      await handleOAuthRedirect();
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
          (window.location.hash && window.location.hash.includes('access_token'))) {
        console.log('Auth callback detected, attempting to handle token');
        
        // Try to handle OAuth token if present (fail silently if not)
        handleOAuthRedirect().then(success => {
          if (success) {
            console.log('Successfully handled auth token in main.tsx mount');
            // Token was handled, will redirect in the AuthCallback component
          }
        }).catch(err => {
          console.error('Error handling auth token in main.tsx:', err);
          // Continue rendering the app, the AuthCallback component will handle redirect
        });
      }
    }
  }
});
