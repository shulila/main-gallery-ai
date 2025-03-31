import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>('Processing login...');

  useEffect(() => {
    console.log('AuthCallback component mounted');
    console.log('Current URL:', window.location.href);
    
    // Try to extract token from hash
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const tokenFromHash = hashParams.get('access_token');
    
    // Try to extract token from query params (some OAuth flows use this)
    const queryParams = new URLSearchParams(window.location.search);
    const tokenFromQuery = queryParams.get('access_token');
    
    const token = tokenFromHash || tokenFromQuery;
    
    // Check if there's any image sync data in the session storage
    // This could be set by the extension before redirecting to auth
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
    
    console.log('🔑 access_token detected:', token ? 'YES' : 'NO');
    if (token) {
      console.log('Token found, storing in localStorage');
      // Store in multiple formats to ensure compatibility
      localStorage.setItem('access_token', token);
      localStorage.setItem('main_gallery_auth_token', JSON.stringify({
        access_token: token,
        timestamp: Date.now()
      }));
      
      setStatus('Login successful! Redirecting...');
      
      // Slight delay before redirect to ensure processing
      setTimeout(() => {
        console.log('Redirecting to destination');
        
        // If there's pending sync data, redirect to gallery
        if (syncData && syncData.images && syncData.images.length > 0) {
          // Store the sync data in session storage for the gallery to pick up
          sessionStorage.setItem('maingallery_sync_images', JSON.stringify(syncData.images));
          navigate('/gallery');
        } else {
          // Otherwise redirect to home page
          navigate('/');
        }
      }, 2000);
    } else {
      console.error('No access token found in URL');
      setStatus('Login failed. No access token found.');
      // Redirect to login page after a delay
      setTimeout(() => navigate('/auth'), 3000);
    }
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-2xl font-bold mb-4">{status}</h1>
      <p className="text-gray-600">You will be redirected automatically...</p>
    </div>
  );
}
