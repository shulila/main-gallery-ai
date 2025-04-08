
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle, resetPassword, session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const defaultTabParam = searchParams.get('signup') === 'true' ? 'signup' : 'signin';
  
  const showForgotPassword = searchParams.get('forgotPassword') === 'true';
  const fromExtension = searchParams.get('from') === 'extension';
  const redirectPath = searchParams.get('redirect') || '/gallery';
  
  const [activeTab, setActiveTab] = useState(defaultTabParam);
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(showForgotPassword);

  // Check if redirected with OAuth callback action (Google sign-in)
  const [authInProgress, setAuthInProgress] = useState(false);
  
  useEffect(() => {
    console.log('[MainGallery] AuthPage loaded with params:', {
      searchParams: Object.fromEntries(searchParams),
      defaultTab: defaultTabParam,
      forgotPassword: showForgotPassword,
      fromExtension,
      redirectPath
    });
    
    // Check URL for tokens - direct processing of OAuth callback
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      console.log('[MainGallery] AuthPage detected access token in URL hash, setting authInProgress');
      setAuthInProgress(true);
      
      // Wait for the session to be established by another component
      const checkSessionInterval = setInterval(() => {
        if (session) {
          clearInterval(checkSessionInterval);
          console.log('[MainGallery] Session detected after OAuth callback, will redirect');
          handleSessionUpdate();
        }
      }, 500);
      
      // Safety timeout
      setTimeout(() => {
        clearInterval(checkSessionInterval);
        setAuthInProgress(false);
      }, 5000);
    }

    // Check for chrome extension messages
    const handleExtensionMessage = (event) => {
      if (event.data && event.data.type === 'EXTENSION_AUTH_REQUEST') {
        console.log('[MainGallery] Received auth request from extension:', event.data);
        // Handle any specific auth requests from extension if needed
      }
    };

    window.addEventListener('message', handleExtensionMessage);
    return () => window.removeEventListener('message', handleExtensionMessage);
  }, [searchParams, defaultTabParam, showForgotPassword, fromExtension, redirectPath]);
  
  // Handle session redirect
  const handleSessionUpdate = () => {
    if (session) {
      console.log('[MainGallery] User is logged in, redirecting to:', redirectPath);
      
      if (fromExtension) {
        console.log('[MainGallery] Logged in from extension, will redirect to gallery and notify extension');
        toast({
          title: "Login successful",
          description: "You are now logged in",
        });
        
        // Notify extension about successful login if coming from extension
        try {
          window.postMessage({
            type: "WEB_APP_TO_EXTENSION",
            action: "loginSuccess",
            email: session?.user?.email,
            timestamp: Date.now()
          }, "*");
        } catch (e) {
          console.error("[MainGallery] Failed to notify extension about login:", e);
        }
        
        // Navigate to gallery
        navigate('/gallery');
      } else if (redirectPath.startsWith('chrome-extension://') || 
                redirectPath.startsWith('http://') || 
                redirectPath.startsWith('https://')) {
        window.location.href = redirectPath;
      } else {
        navigate(redirectPath);
      }
    }
  };

  useEffect(() => {
    if (!authInProgress) {
      handleSessionUpdate();
    }
  }, [session, navigate, redirectPath, fromExtension, toast, authInProgress]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Missing fields",
        description: "Please enter your email and password.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await signIn(email, password);
      // Auth state change will trigger redirect
    } catch (error: any) {
      console.error('[MainGallery] Login error:', error);
      toast({
        title: "Login failed",
        description: error.message || "Please check your email and password",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Missing fields",
        description: "Please enter your email and password.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await signUp(email, password);
      toast({
        title: "Account created",
        description: "Please check your email to verify your account.",
      });
      setActiveTab('signin');
    } catch (error: any) {
      console.error('[MainGallery] Signup error:', error);
      toast({
        title: "Signup failed",
        description: error.message || "Please check your email and try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address to reset your password.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await resetPassword(email);
      toast({
        title: "Password reset email sent",
        description: "Check your email for password reset instructions",
      });
      setIsForgotPasswordMode(false);
    } catch (error: any) {
      console.error('[MainGallery] Password reset error:', error);
      toast({
        title: "Password reset failed",
        description: error.message || "Please check your email and try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      console.log('[MainGallery] Starting Google sign-in process');
      await signInWithGoogle();
      // The redirect will be handled by the Google OAuth flow
    } catch (error: any) {
      console.error('[MainGallery] Google login error:', error);
      toast({
        title: "Google login failed",
        description: error.message || "Could not authenticate with Google",
        variant: "destructive",
      });
      setGoogleLoading(false);
    }
  };

  if (authInProgress) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-lg font-medium">Processing authentication...</p>
          <p className="text-sm text-muted-foreground">Please wait while we complete your sign-in</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome to MainGallery.AI</CardTitle>
          <CardDescription>
            {isForgotPasswordMode 
              ? "Reset your password" 
              : "Log in or sign up to access your AI art collection"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isForgotPasswordMode ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input 
                  id="reset-email" 
                  type="email" 
                  placeholder="you@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending reset email...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
              <Button
                type="button"
                variant="link"
                className="w-full mt-2"
                onClick={() => setIsForgotPasswordMode(false)}
              >
                Back to login
              </Button>
            </form>
          ) : (
            <>
              {/* Google Sign In Button - Available on all forms */}
              <div className="mb-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full flex items-center justify-center gap-2" 
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting || googleLoading}
                  id="google-sign-in-btn"
                >
                  {googleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                      <g transform="matrix(1, 0, 0, 1, 0, 0)" fill="none">
                        <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z" fill="#4285F4"/>
                      </g>
                    </svg>
                  )}
                  Continue with Google
                </Button>
              </div>
              
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with email
                  </span>
                </div>
              </div>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="signin">Log In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                
                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="you@example.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <Button 
                          variant="link" 
                          className="text-sm text-primary p-0 h-auto" 
                          onClick={() => setIsForgotPasswordMode(true)}
                          type="button"
                        >
                          Forgot password?
                        </Button>
                      </div>
                      <Input 
                        id="password" 
                        type="password" 
                        placeholder="" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        "Log In"
                      )}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input 
                        id="signup-email" 
                        type="email" 
                        placeholder="you@example.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input 
                        id="signup-password" 
                        type="password" 
                        placeholder="" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Password must be at least 8 characters
                      </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 text-center text-sm text-muted-foreground">
          <p>
            By continuing, you agree to MainGallery's Terms of Service and Privacy Policy.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AuthPage;
