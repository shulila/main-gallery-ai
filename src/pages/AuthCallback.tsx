
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthCallbackHandler } from '@/components/auth/AuthCallbackHandler';
import { AuthCallbackStatus } from '@/components/auth/AuthCallbackStatus';

/**
 * Main authentication callback page that handles OAuth redirects
 */
export default function AuthCallback() {
  const [status, setStatus] = useState<string>('Processing login...');
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      {/* The handler component processes the authentication token */}
      <AuthCallbackHandler 
        setStatus={setStatus} 
        setError={setError} 
      />
      
      {/* The status component displays the current state to the user */}
      <AuthCallbackStatus 
        status={status} 
        error={error} 
      />
    </>
  );
}
