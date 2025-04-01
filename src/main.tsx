
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { handleOAuthRedirect } from './utils/authTokenHandler';

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
