
/**
 * Supabase client wrapper for Chrome Extension
 * Provides access to Supabase from extension background script
 */

// Using hardcoded values for the extension
const SUPABASE_URL = "https://ovhriawcqvcpagcaidlb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92aHJpYXdjcXZjcGFnY2FpZGxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2MDQxNzMsImV4cCI6MjA1ODE4MDE3M30.Hz5AA2WF31w187GkEOtKJCpoEi6JDcrdZ-dDv6d8Z7U";

// Create and export the Supabase client
let supabaseClient;

// Initialize Supabase client without using top-level await
function initSupabaseClient() {
  // Check if we have the createClient function available
  try {
    // Dynamically import createClient if available in runtime context
    // Use a promise-based approach instead of await
    import('@supabase/supabase-js')
      .then(({ createClient }) => {
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          auth: {
            storage: localStorage,
            persistSession: true,
            autoRefreshToken: true
          }
        });
        console.log("[MainGallery] Supabase client initialized");
      })
      .catch(err => {
        console.error("[MainGallery] Error importing Supabase client:", err);
        createMinimalMockClient();
      });
  } catch (err) {
    console.error("[MainGallery] Error initializing Supabase client:", err);
    createMinimalMockClient();
  }
}

// Create a minimal mock client for environments where Supabase can't be loaded
function createMinimalMockClient() {
  supabaseClient = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signIn: () => Promise.resolve({ data: null, error: "Supabase not initialized" }),
      signOut: () => Promise.resolve({ error: null })
    }
  };
  console.log("[MainGallery] Created minimal mock Supabase client");
}

// Initialize the client immediately
initSupabaseClient();

// Export the client - make sure we use both export styles for compatibility
export default supabaseClient; 
export const supabase = supabaseClient;

// Also export config for use in other modules
export const supabaseConfig = {
  url: SUPABASE_URL,
  key: SUPABASE_PUBLISHABLE_KEY
};

// Log that this module was loaded
console.log("[MainGallery] supabaseClient.js loaded");
