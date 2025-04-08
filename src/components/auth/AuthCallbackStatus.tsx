
import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AuthCallbackStatusProps = {
  status: string;
  error: string | null;
};

/**
 * Component to display authentication status during OAuth callback
 */
export const AuthCallbackStatus = ({ status, error }: AuthCallbackStatusProps) => {
  const [showDebug, setShowDebug] = useState(false);
  
  const toggleDebug = () => {
    setShowDebug(!showDebug);
    const debugEl = document.getElementById('auth-debug-info');
    if (debugEl) {
      debugEl.style.display = showDebug ? 'none' : 'block';
    }
  };
  
  return (
    <div className="text-center p-6 max-w-md mx-auto">
      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold block mb-1">Authentication Error</strong>
          <span className="block sm:inline">{error}</span>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={toggleDebug}
          >
            {showDebug ? 'Hide' : 'View'} Debug Info
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <h3 className="text-xl font-semibold">{status}</h3>
          <p className="text-sm text-gray-500">
            You'll be redirected automatically once the authentication is complete.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDebug}
            className="mt-4 text-xs text-gray-400"
          >
            {showDebug ? 'Hide' : 'View'} Debug Info
          </Button>
        </div>
      )}
    </div>
  );
};

export default AuthCallbackStatus;
