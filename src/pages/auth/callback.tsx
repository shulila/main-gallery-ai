
import React, { useState, useEffect } from "react";
import { AuthCallbackHandler } from "@/components/auth/AuthCallbackHandler";
import { AuthCallbackStatus } from "@/components/auth/AuthCallbackStatus";
import { supabase } from "../../chrome-extension/utils/supabaseClient.js";

/**
 * OAuth callback page that handles authentication redirects
 * This page is used as the target for OAuth provider redirects, including Google
 */
const Callback: React.FC = () => {
  // Set up status tracking for the authentication process
  const [status, setStatus] = useState<string>('Processing authentication...');
  const [error, setError] = useState<string | null>(null);
  
  // Log auth information to console for debugging
  useEffect(() => {
    const logAuthDebug = async () => {
      console.log('[MainGallery] Auth callback page loaded');
      console.log('[MainGallery] URL:', window.location.href);
      
      // Check if we have token in URL
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hasToken = hashParams.has('access_token');
      console.log('[MainGallery] Has token in hash:', hasToken);
      
      // Check current session
      const { data } = await supabase.auth.getSession();
      console.log('[MainGallery] Current session:', data.session ? 'Active' : 'None');
      if (data.session) {
        console.log('[MainGallery] Session user:', data.session.user.email);
      }
    };
    
    logAuthDebug();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      {/* Display the current status to the user */}
      <AuthCallbackStatus 
        status={status} 
        error={error} 
      />
      
      {/* Process the authentication token */}
      <AuthCallbackHandler 
        setStatus={setStatus} 
        setError={setError} 
      />
    </div>
  );
};

export default Callback;
