
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
    USER: 'main-gallery-user'
  }
};
