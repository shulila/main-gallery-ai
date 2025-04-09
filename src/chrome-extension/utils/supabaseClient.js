
/**
 * Supabase client wrapper for Chrome Extension
 * Provides access to Supabase from extension background script
 */

// Using relative path instead of alias import
const SUPABASE_URL = "https://ovhriawcqvcpagcaidlb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92aHJpYXdjcXZjcGFnY2FpZGxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2MDQxNzMsImV4cCI6MjA1ODE4MDE3M30.Hz5AA2WF31w187GkEOtKJCpoEi6JDcrdZ-dDv6d8Z7U";

// Export this for use in the background script
export const supabaseConfig = {
  url: SUPABASE_URL,
  key: SUPABASE_PUBLISHABLE_KEY
};

// Log that this module was loaded
console.log("[MainGallery] supabaseClient.js loaded");
