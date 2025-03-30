
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from '@/contexts/AuthContext';

// Form schemas
const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const signupSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const Auth = ({ 
  mode = 'modal', 
  redirectTo = '/gallery', 
  initialTab = 'login' 
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOAuthLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  
  // Set the active tab based on initialTab prop or query parameter
  useEffect(() => {
    // Check URL query parameters for tab
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    
    if (tabParam === 'login' || tabParam === 'signup') {
      setActiveTab(tabParam);
    } else if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, location.search]);
  
  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signupForm = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const handleLogin = async (values) => {
    setLoading(true);
    
    try {
      await signIn(values.email, values.password);
      
      // Get parameters from query string
      const searchParams = new URLSearchParams(location.search);
      const redirectParam = searchParams.get('redirect');
      const fromExtension = searchParams.get('from') === 'extension';
      
      // Handle different navigation flows based on entry point
      if (fromExtension) {
        // If login came from extension, just close the tab or show success message
        toast({
          title: "Login successful",
          description: "You can now close this tab and return to the extension",
        });
        
        // Optional: show a message that they can close this tab
        // For now, we'll redirect them to the gallery after a brief delay
        setTimeout(() => {
          navigate('/gallery');
        }, 3000);
      } else if (redirectParam) {
        // Check if it's an external URL (like a chrome-extension:// URL)
        if (redirectParam.startsWith('chrome-extension://') || 
            redirectParam.startsWith('http://') || 
            redirectParam.startsWith('https://')) {
          window.location.href = redirectParam;
        } else {
          // For internal routes
          navigate(redirectParam);
        }
      } else {
        // Default redirect to gallery
        navigate(redirectTo);
      }
    } catch (error) {
      console.error('Login handler error:', error);
      // Error is already handled by the signIn function
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (values) => {
    setLoading(true);
    
    try {
      await signUp(values.email, values.password);
      
      // Check if the signup was initiated from the extension
      const searchParams = new URLSearchParams(location.search);
      const fromExtension = searchParams.get('from') === 'extension';
      
      if (fromExtension) {
        // Show special message for extension users
        toast({
          title: "Account created",
          description: "Please log in to continue using the extension",
        });
      } else {
        toast({
          title: "Account created",
          description: "Please log in to continue",
        });
      }
      
      // Switch to login tab after signup
      setActiveTab('login');
    } catch (error) {
      console.error('Signup handler error:', error);
      // Error is already handled by the signUp function
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setOAuthLoading(true);
    try {
      await signInWithGoogle();
      
      // Get parameters from query string
      const searchParams = new URLSearchParams(location.search);
      const redirectParam = searchParams.get('redirect');
      
      if (redirectParam) {
        // Handle redirect after successful OAuth login
        if (redirectParam.startsWith('chrome-extension://') || 
            redirectParam.startsWith('http://') || 
            redirectParam.startsWith('https://')) {
          window.location.href = redirectParam;
        } else {
          navigate(redirectParam);
        }
      } else {
        navigate(redirectTo);
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      toast({
        title: "Google sign in failed",
        description: error.message || "Unable to sign in with Google",
        variant: "destructive",
      });
    } finally {
      setOAuthLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = loginForm.getValues('email');
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address to reset your password",
        variant: "destructive",
      });
      return;
    }

    try {
      await resetPassword(email);
      toast({
        title: "Password reset email sent",
        description: "Check your inbox for instructions to reset your password",
      });
    } catch (error) {
      console.error('Password reset error:', error);
      toast({
        title: "Password reset failed",
        description: error.message || "Unable to send password reset email",
        variant: "destructive",
      });
    }
  };

  // OAuth sign-in buttons
  const renderOAuthButtons = () => {
    return (
      <div className="space-y-3">
        <Button 
          type="button" 
          variant="outline" 
          className="w-full flex items-center gap-2 font-normal"
          onClick={handleGoogleSignIn}
          disabled={oauthLoading}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" className="text-gray-700">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>
      </div>
    );
  };

  return (
    <Card className={mode === 'page' ? 'max-w-md mx-auto' : ''}>
      <CardHeader>
        <CardTitle>Welcome to Main Gallery</CardTitle>
        <CardDescription>
          Access all your AI-generated content in one place
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Log In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            {/* OAuth Buttons for Login */}
            {renderOAuthButtons()}
            
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-2 text-xs text-muted-foreground">or continue with email</span>
              </div>
            </div>
            
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="your@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Password</FormLabel>
                        <Button 
                          type="button" 
                          variant="link" 
                          className="p-0 h-auto text-xs" 
                          onClick={handleForgotPassword}
                        >
                          Forgot password?
                        </Button>
                      </div>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600" disabled={loading || oauthLoading}>
                  {loading ? "Logging in..." : "Log in"}
                </Button>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="signup">
            {/* OAuth Buttons for Signup */}
            {renderOAuthButtons()}
            
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-2 text-xs text-muted-foreground">or continue with email</span>
              </div>
            </div>
            
            <Form {...signupForm}>
              <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                <FormField
                  control={signupForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="your@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={signupForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={signupForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600" disabled={loading || oauthLoading}>
                  {loading ? "Creating account..." : "Sign up"}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </CardFooter>
    </Card>
  );
};

export default Auth;
