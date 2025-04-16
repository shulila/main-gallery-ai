
import { logger } from '../logger.js';
import { authService } from './auth-service.js';
import { storage } from '../storage.js';
import { verifyIconsAccessibility } from '../file-utils.js';

// Helper function for showing toast notifications
export function showToast(message, type = 'info') {
  const existingToast = document.querySelector('.main-gallery-toast');
  if (existingToast) existingToast.remove();
  
  const toast = document.createElement('div');
  toast.className = `main-gallery-toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Handle Google login
export async function handleGoogleLogin() {
  try {
    await authService.signInWithGoogle();
    return true;
  } catch (error) {
    logger.error('Google login error:', error);
    showToast('Login failed. Please try again.', 'error');
    return false;
  }
}

// Handle email login
export async function handleEmailLogin(email, password) {
  if (!email || !password) {
    showToast('Please enter both email and password', 'error');
    return false;
  }
  
  try {
    const result = await authService.signInWithEmailPassword(email, password);
    if (result.success) {
      showToast('Successfully signed in!', 'success');
      return true;
    } else {
      showToast(result.error || 'Login failed', 'error');
      return false;
    }
  } catch (error) {
    logger.error('Email login error:', error);
    showToast('Login failed. Please try again.', 'error');
    return false;
  }
}

// Handle logout
export async function handleLogout() {
  try {
    await authService.signOut();
    showToast('Successfully signed out', 'success');
    return true;
  } catch (error) {
    logger.error('Logout error:', error);
    showToast('Logout failed. Please try again.', 'error');
    return false;
  }
}

// Image error handling
export function setupImageErrorHandling() {
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    const originalSrc = img.src;
    img.onerror = function() {
      logger.warn(`Failed to load image: ${originalSrc}`);
      // Try alternate path
      if (originalSrc.includes('assets/icons/')) {
        this.src = originalSrc.replace('assets/icons/', 'icons/');
      } else if (originalSrc.includes('icons/')) {
        this.src = originalSrc.replace('icons/', 'assets/icons/');
      } else {
        this.style.display = 'none';
        this.classList.add('error');
      }
    };
  });
}

// Initialize auth state
export async function initializeAuth() {
  try {
    await verifyIconsAccessibility(); // Verify icon files
    setupImageErrorHandling(); // Set up image error handlers
    
    const isAuthenticated = await authService.isAuthenticated();
    return { isAuthenticated };
  } catch (error) {
    logger.error('Auth initialization error:', error);
    return { isAuthenticated: false, error };
  }
}
