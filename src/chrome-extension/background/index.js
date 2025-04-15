/**
 * Background script for the MainGallery extension
 * This file handles extension background tasks and communication
 */

// Log that the background script is alive
console.log("[MainGallery] Background script is alive");

// Handle installation and updates
chrome.runtime.onInstalled.addListener((details) => {
  console.log("[MainGallery] Extension installed/updated:", details.reason);
  
  // Set initial state
  if (details.reason === 'install') {
    console.log("[MainGallery] First install - setting initial state");
    
    // Store default settings
    chrome.storage.local.set({
      autoScanEnabled: true,
      notificationsEnabled: true,
      lastSyncTime: 0,
      userEmail: null,
      isAuthenticated: false
    });
  }
});

// Import utilities (using relative paths for compatibility)
import { setupAuthListeners } from './auth.js';
import { setupMessageHandlers } from './messaging.js';
import { setupContextMenus } from './context-menus.js';

// Initialize core functionality
setupAuthListeners();
setupMessageHandlers();
setupContextMenus();

// Keep service worker alive
const keepAlive = () => {
  console.log("[MainGallery] Keeping service worker alive");
  setTimeout(keepAlive, 20 * 60 * 1000); // 20 minutes
};
keepAlive();

// Handle unhandled errors
self.addEventListener('unhandledrejection', event => {
  console.error("[MainGallery] Unhandled promise rejection:", event.reason);
});

self.addEventListener('error', event => {
  console.error("[MainGallery] Uncaught error:", event.error);
});

// Log successful initialization
console.log("[MainGallery] Background service worker initialized");
