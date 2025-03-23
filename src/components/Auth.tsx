
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
  const { signIn, signUp } = useAuth();
  
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

  return (
    <Card className={mode === 'page' ? 'max-w-md mx-auto' : ''}>
      <CardHeader>
        <CardTitle>Welcome to Main Gallery</CardTitle>
        <CardDescription>
          Sign in to access all your AI-generated content in one place
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Log In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600" disabled={loading}>
                  {loading ? "Logging in..." : "Log in"}
                </Button>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="signup">
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
                
                <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600" disabled={loading}>
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
