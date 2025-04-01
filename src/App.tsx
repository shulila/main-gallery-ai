
import { useEffect } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthContext';
import AuthPage from './pages/AuthPage';
import AuthCallback from './pages/AuthCallback';
import Gallery from './pages/Gallery';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import Detail from './pages/Detail';
import Start from './pages/Start';
import Settings from './pages/Settings';
import Platforms from './pages/Platforms';
import FeatureDetail from './pages/FeatureDetail';

import './App.css';

function App() {
  // Special handling for auth callbacks with hash fragments
  useEffect(() => {
    // Check if we're on any URL with an access_token in the hash or query params
    const hash = window.location.hash;
    const search = window.location.search;
    
    if ((hash && hash.includes('access_token=')) || (search && search.includes('access_token='))) {
      console.log('Detected access token in URL - this should trigger AuthCallback component');
    }
  }, []);

  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/platforms" element={<Platforms />} />
        <Route path="/start" element={<Start />} />
        <Route path="/detail/:id" element={<Detail />} />
        <Route path="/features/:id" element={<FeatureDetail />} />
        
        {/* Special wildcard route to handle auth callback with hash fragments */}
        <Route path="/auth/callback/*" element={<AuthCallback />} />
        
        {/* Special fallback for auth callback with fragment */}
        <Route path="/_callback/*" element={<AuthCallback />} />
        
        {/* Catch all unknown routes */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
