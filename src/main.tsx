
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

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
    // This helps hosting platforms handle routes correctly
    if (window.location.pathname !== '/' && !window.location.pathname.includes('.')) {
      console.log('SPA route detected on direct load:', window.location.pathname);
    }
  }
});
