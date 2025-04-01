
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<string>('Processing login...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('AuthCallback component mounted');
    console.log('Current URL:', window.location.href);
    
    // Function to handle token and complete authentication
    const completeAuth = async () => {
      try {
        // Try to extract token from hash
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const tokenFromHash = hashParams.get('access_token');
        
        // Try to extract token from query params (some OAuth flows use this)
        const queryParams = new URLSearchParams(window.location.search);
        const tokenFromQuery = queryParams.get('access_token');
        
        const token = tokenFromHash || tokenFromQuery;
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
        const expiresIn = hashParams.get('expires_in') || queryParams.get('expires_in');
        
        console.log('🔑 Token detection attempt', { 
          hashToken: !!tokenFromHash, 
          queryToken: !!tokenFromQuery,
          refreshToken: !!refreshToken,
          hash: window.location.hash,
          search: window.location.search
        });
        
        if (token) {
          console.log('Token found, storing in localStorage and creating session');
          
          // Calculate expiration time (24 hours from now if not provided)
          const expiresAt = expiresIn 
            ? Date.now() + (parseInt(expiresIn) * 1000) 
            : Date.now() + (24 * 60 * 60 * 1000);
            
          // Store tokens in localStorage in multiple formats to ensure compatibility
          localStorage.setItem('access_token', token);
          localStorage.setItem('main_gallery_auth_token', JSON.stringify({
            access_token: token,
            refresh_token: refreshToken || '',
            timestamp: Date.now(),
            expires_at: expiresAt
          }));
          
          if (refreshToken) {
            localStorage.setItem('refresh_token', refreshToken);
          }
          
          // Try to create a session with Supabase using the token
          try {
            console.log('Setting Supabase session with token');
            const { data, error } = await supabase.auth.setSession({
              access_token: token,
              refresh_token: refreshToken || ''
            });
            
            if (error) {
              console.error('Error setting Supabase session:', error);
              throw error;
            }
            
            if (data?.session) {
              console.log('Successfully set Supabase session:', data.session);
              
              // Store user email if available
              if (data.session.user?.email) {
                localStorage.setItem('main_gallery_user_email', data.session.user.email);
                
                // If in Chrome extension context, also store in chrome.storage
                if (typeof window !== 'undefined' && 'chrome' in window && window.chrome?.storage) {
                  try {
                    window.chrome.storage.sync.set({
                      'main_gallery_auth_token': {
                        access_token: token,
                        refresh_token: refreshToken || '',
                        timestamp: Date.now(),
                        expires_at: expiresAt
                      },
                      'main_gallery_user_email': data.session.user.email
                    }, () => {
                      console.log('Auth data synced to chrome.storage');
                    });
                  } catch (err) {
                    console.error('Error syncing to chrome.storage:', err);
                  }
                }
              }
            }
          } catch (error) {
            console.error('Failed to set Supabase session:', error);
            // Continue anyway as we have the token stored in localStorage
          }
          
          setStatus('Login successful! Redirecting...');
          
          // Check if there's pending sync data in the session storage
          const pendingSync = sessionStorage.getItem('maingallery_pending_sync');
          let syncData = null;
          
          if (pendingSync) {
            try {
              syncData = JSON.parse(pendingSync);
              console.log('Found pending image sync data:', syncData);
            } catch (e) {
              console.error('Error parsing pending sync data:', e);
            }
            // Clear the pending sync data
            sessionStorage.removeItem('maingallery_pending_sync');
          }
          
          toast({
            title: "Login Successful",
            description: "You've been logged in successfully!",
          });
          
          // Slight delay before redirect to ensure processing
          setTimeout(() => {
            console.log('Redirecting to destination');
            
            // If there's pending sync data, redirect to gallery
            if (syncData && syncData.images && syncData.images.length > 0) {
              // Store the sync data in session storage for the gallery to pick up
              sessionStorage.setItem('maingallery_sync_images', JSON.stringify(syncData.images));
              navigate('/gallery');
            } else {
              // Otherwise redirect to gallery as default destination
              navigate('/gallery');
            }
          }, 1000);
        } else {
          console.error('No access token found in URL');
          console.log('URL params:', { 
            hash: window.location.hash,
            search: window.location.search
          });
          setStatus('Login failed. No access token found.');
          setError('We couldn\'t find an authentication token in the URL. Please try logging in again.');
          
          toast({
            title: "Login Failed",
            description: "No authentication token found. Please try again.",
            variant: "destructive",
          });
          
          // Redirect to login page after a delay
          setTimeout(() => navigate('/auth'), 3000);
        }
      } catch (err) {
        console.error('Error during auth callback processing:', err);
        setStatus('Authentication error');
        setError('An error occurred during login. Please try again.');
        
        toast({
          title: "Authentication Error",
          description: "An error occurred during login. Please try again.",
          variant: "destructive",
        });
        
        // Redirect to login page after a delay
        setTimeout(() => navigate('/auth'), 3000);
      }
    };
    
    // Execute the auth completion function
    completeAuth();
  }, [navigate, toast]);

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
}
