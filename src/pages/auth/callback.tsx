
import React, { useState } from "react";
import { AuthCallbackHandler } from "@/components/auth/AuthCallbackHandler";
import { AuthCallbackStatus } from "@/components/auth/AuthCallbackStatus";

/**
 * OAuth callback page that handles authentication redirects
 * This page is used as the target for OAuth provider redirects, including Google
 */
const Callback: React.FC = () => {
  // Set up status tracking for the authentication process
  const [status, setStatus] = useState<string>('Processing authentication...');
  const [error, setError] = useState<string | null>(null);

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
