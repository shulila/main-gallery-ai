
import React from 'react';
import { Loader2 } from 'lucide-react';

type AuthCallbackStatusProps = {
  status: string;
  error: string | null;
};

/**
 * Component to display authentication status during OAuth callback
 */
export const AuthCallbackStatus = ({ status, error }: AuthCallbackStatusProps) => {
  return (
    <div className="text-center p-6 max-w-md mx-auto">
      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold block mb-1">Authentication Error</strong>
          <span className="block sm:inline">{error}</span>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <h3 className="text-xl font-semibold">{status}</h3>
          <p className="text-sm text-gray-500">
            You'll be redirected automatically once the authentication is complete.
          </p>
        </div>
      )}
    </div>
  );
};
