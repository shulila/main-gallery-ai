
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
  
  useEffect(() => {
    console.log('AuthPage loaded with params:', {
      searchParams: Object.fromEntries(searchParams),
      defaultTab: defaultTabParam,
      forgotPassword: showForgotPassword,
      fromExtension,
      redirectPath
    });

    // Check for chrome extension messages
    const handleExtensionMessage = (event) => {
      if (event.data && event.data.type === 'EXTENSION_AUTH_REQUEST') {
        console.log('Received auth request from extension:', event.data);
        // Handle any specific auth requests from extension if needed
      }
    };

    window.addEventListener('message', handleExtensionMessage);
    return () => window.removeEventListener('message', handleExtensionMessage);
  }, [searchParams, defaultTabParam, showForgotPassword, fromExtension, redirectPath]);

  useEffect(() => {
    if (session) {
      console.log('User is already logged in, redirecting to:', redirectPath);
      
      if (fromExtension) {
        console.log('Logged in from extension, will redirect to gallery and notify extension');
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
          console.error("Failed to notify extension about login:", e);
        }
        
        setTimeout(() => {
          navigate('/gallery');
        }, 1000);
      } else if (redirectPath.startsWith('chrome-extension://') || 
                redirectPath.startsWith('http://') || 
                redirectPath.startsWith('https://')) {
        window.location.href = redirectPath;
      } else {
        navigate(redirectPath);
      }
    }
  }, [session, navigate, redirectPath, fromExtension, toast]);

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
      
    } catch (error: any) {
      console.error('Login error:', error);
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
      console.error('Signup error:', error);
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
      console.error('Password reset error:', error);
      toast({
        title: "Password reset failed",
        description: error.message || "Please check your email and try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="signin">Log In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Continue with email
                  </span>
                </div>
              </div>
              
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
