
/**
 * OAuth Configuration for MainGallery.AI Chrome Extension
 */

// Google OAuth client ID
export const GOOGLE_CLIENT_ID = '648580197357-2v9sfcorca7060e4rdjr1904a4f1qa26.apps.googleusercontent.com';

// Google OAuth scopes
export const GOOGLE_SCOPES = ['openid', 'email', 'profile'];

// Web app URLs
export const WEB_APP_URLS = {
  BASE: 'https://main-gallery-ai.lovable.app',
  AUTH: 'https://main-gallery-ai.lovable.app/auth',
  AUTH_CALLBACK: 'https://main-gallery-ai.lovable.app/auth', // Changed from /auth/callback to /auth
  GALLERY: 'https://main-gallery-ai.lovable.app/gallery',
  AUTH_ERROR: 'https://main-gallery-ai.lovable.app/auth-error'
};

// Cookie configuration
export const COOKIE_CONFIG = {
  DOMAIN: '.main-gallery-ai.lovable.app',
  AUTH_COOKIE_NAME: 'mg_auth',
  SESSION_COOKIE_NAME: 'mg_session'
};

// Authentication timeouts
export const AUTH_TIMEOUTS = {
  AUTH_FLOW_TIMEOUT: 5 * 60 * 1000, // 5 minutes
  AUTH_SYNC_INTERVAL: 30 * 60 * 1000, // 30 minutes
  TOKEN_REFRESH_BUFFER: 5 * 60 * 1000 // 5 minutes before expiry
};
