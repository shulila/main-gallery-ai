
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
        <p className="text-red-500 mb-4">{error}</p>
      ) : (
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p className="text-gray-600">You will be redirected automatically...</p>
        </div>
      )}
    </div>
  );
};
