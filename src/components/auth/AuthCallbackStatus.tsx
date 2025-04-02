
import { Loader2 } from 'lucide-react';

type AuthCallbackStatusProps = {
  status: string;
  error: string | null;
};

/**
 * Component that displays the current authentication status
 */
export const AuthCallbackStatus = ({ status, error }: AuthCallbackStatusProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-2xl font-bold mb-4">{status}</h1>
      
      {error ? (
        <div className="space-y-4">
          <p className="text-red-500 mb-4">{error}</p>
          <div className="text-sm text-gray-500 max-w-md mx-auto">
            <p>If you continue to see this error, please try:</p>
            <ul className="list-disc text-left ml-8 mt-2">
              <li>Refreshing the page</li>
              <li>Clearing your browser cookies and cache</li>
              <li>Using a different browser</li>
              <li>Checking if you're using the correct domain (main-gallery-hub.lovable.app)</li>
              <li>Contacting support if the issue persists</li>
            </ul>
          </div>
          <a 
            href="/auth" 
            className="inline-block mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Return to Login
          </a>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p className="text-gray-600">You will be redirected automatically...</p>
        </div>
      )}
      
      {/* Debug section to help with troubleshooting - only visible in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 border rounded bg-gray-50 max-w-lg text-left text-xs">
          <h3 className="font-bold mb-2">Debug Information:</h3>
          <p><strong>Current URL:</strong> {window.location.href}</p>
          <p><strong>Path:</strong> {window.location.pathname}</p>
          <p><strong>Hash:</strong> {window.location.hash ? window.location.hash : '(no hash)'}</p>
          <p><strong>Status:</strong> {status}</p>
          {error && <p><strong>Error:</strong> {error}</p>}
        </div>
      )}
      
      {/* Always provide debug information for production since we're troubleshooting */}
      {process.env.NODE_ENV !== 'development' && (
        <div className="mt-8 p-2 border rounded bg-gray-50 max-w-lg text-left text-xs opacity-70 hover:opacity-100 transition-opacity">
          <details>
            <summary className="cursor-pointer">View Debug Info</summary>
            <div className="mt-2 space-y-1">
              <p><strong>Domain:</strong> {window.location.hostname}</p>
              <p><strong>Path:</strong> {window.location.pathname}</p>
              <p><strong>Hash:</strong> {window.location.hash ? '(contains token)' : '(no hash)'}</p>
              <p><strong>Status:</strong> {status}</p>
              {error && <p><strong>Error:</strong> {error}</p>}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};
