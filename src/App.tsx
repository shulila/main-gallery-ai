
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/AuthContext';

// Pages
import Index from '@/pages/Index';
import Start from '@/pages/Start';
import FeatureDetail from '@/pages/FeatureDetail';
import Gallery from '@/pages/Gallery';
import Detail from '@/pages/Detail';
import Platforms from '@/pages/Platforms';
import AuthPage from '@/pages/AuthPage';
import AuthCallback from '@/pages/AuthCallback';
import NotFound from '@/pages/NotFound';

// Create a QueryClient once
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider defaultTheme="light" storageKey="maingallery-theme">
          <Router>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/start" element={<Start />} />
              <Route path="/features/:featureId" element={<FeatureDetail />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/gallery/:imageId" element={<Detail />} />
              <Route path="/platforms" element={<Platforms />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
          <Toaster />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
