
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const token = hashParams.get('access_token');
    console.log('🔑 access_token from hash:', token);

    if (token) {
      localStorage.setItem('access_token', token);
      // Slight delay before redirect to ensure processing
      setTimeout(() => navigate('/'), 1500);
    } else {
      console.error('No access token found in URL');
    }
  }, []);

  return <div>Processing login...</div>;
}
