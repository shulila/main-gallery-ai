
/**
 * OAuth configuration for MainGallery.AI Chrome Extension
 * מגדיר פרמטרים לאימות ב-OAuth
 */

// Google OAuth configuration
export const GOOGLE_CLIENT_ID = '648580197357-2v9sfcorca7060e4rdjr1904a4f1qa26.apps.googleusercontent.com';

// Redirect URIs
export const REDIRECT_URIS = {
  // Supabase callback URL
  SUPABASE: 'https://ovhriawcqvcpagcaidlb.supabase.co/auth/v1/callback',
  
  // Web app callback URL
  WEB_APP: 'https://main-gallery-ai.lovable.app/auth/callback'
};

// Web app URLs
export const WEB_APP_URLS = {
  // Base URL
  BASE: 'https://main-gallery-ai.lovable.app',
  
  // Gallery page
  GALLERY: 'https://main-gallery-ai.lovable.app/gallery',
  
  // Auth page
  AUTH: 'https://main-gallery-ai.lovable.app/auth',
  
  // Auth callback page
  AUTH_CALLBACK: 'https://main-gallery-ai.lovable.app/auth/callback'
};

// Supabase configuration
export const SUPABASE_CONFIG = {
  URL: 'https://ovhriawcqvcpagcaidlb.supabase.co',
  ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92aHJpYXdjcXZjcGFnY2FpZGxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTQ1MzQwMDAsImV4cCI6MjAxMDExMDAwMH0.qmJ_BHGaVWoVLnkSLDLiDxQGTALQZqODSPTwDgLqJWo'
};

// Cookie configuration
export const COOKIE_CONFIG = {
  // Cookie domain
  DOMAIN: 'main-gallery-ai.lovable.app',
  
  // Cookie names
  NAMES: {
    // Session cookie
    SESSION: 'sb-ovhriawcqvcpagcaidlb-auth-token',
    
    // User cookie
    USER: 'main-gallery-user',
    
    // Access token cookie
    ACCESS_TOKEN: 'sb-access-token',
    
    // Refresh token cookie
    REFRESH_TOKEN: 'sb-refresh-token',
    
    // Auth state cookie
    AUTH_STATE: 'main-gallery-auth-state'
  }
};

// Authentication timeouts
export const AUTH_TIMEOUTS = {
  // Login timeout (1 minute) 
  LOGIN_TIMEOUT: 60000,
  
  // Session refresh interval (1 hour)
  SESSION_REFRESH: 3600000,
  
  // Token refresh margin (5 minutes before expiry)
  TOKEN_REFRESH_MARGIN: 300000,
  
  // Auth sync interval (15 seconds - reduced for faster sync)
  AUTH_SYNC_INTERVAL: 15000
};

// Google OAuth scopes
export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];
