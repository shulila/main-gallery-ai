
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "../../chrome-extension/utils/supabaseClient.js";

export const AuthCallbackHandler = ({ setStatus, setError }: { setStatus: (status: string) => void, setError: (error: string | null) => void }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    console.log("[MainGallery] AuthCallbackHandler initialized");
    console.log("[MainGallery] Current URL:", window.location.href);

    const recordDebugInfo = (status: string, details = {}) => {
      console.log(`[MainGallery] Auth debug - ${status}:`, details);
      setDebugInfo(prev => ({
        ...prev,
        status,
        ...details,
        timestamp: new Date().toISOString()
      }));
    };

    // Check if we need to redirect from preview to production
    const currentURL = window.location.href;
    if (
      currentURL.includes("preview-main-gallery-ai.lovable.app") &&
      (currentURL.includes("#access_token=") || currentURL.includes("?access_token="))
    ) {
      recordDebugInfo("domain_redirect", { from: "preview", to: "production" });
      const correctedURL = currentURL.replace(
        "preview-main-gallery-ai.lovable.app",
        "main-gallery-ai.lovable.app"
      );
      console.log("[MainGallery] Redirecting to:", correctedURL);
      window.location.href = correctedURL;
      return;
    }

    const isFromExtension = window.location.href.includes("chrome-extension://") || 
                            window.location.search.includes("from=extension");
    
    const completeAuth = async () => {
      try {
        recordDebugInfo("auth_process_started", { url: window.location.href, isFromExtension });
        console.log("[MainGallery] Starting OAuth callback processing with URL:", window.location.href);
        
        setStatus("Processing login...");
        
        let success = false;
        let accessToken = "";
        let refreshToken = "";

        // Check for tokens in URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const searchParams = new URLSearchParams(window.location.search);
        
        if (hashParams.has("access_token") || searchParams.has("access_token")) {
          accessToken = hashParams.get("access_token") || searchParams.get("access_token") || "";
          refreshToken = hashParams.get("refresh_token") || searchParams.get("refresh_token") || "";
          
          if (accessToken) {
            recordDebugInfo("token_found_in_url", {
              source: hashParams.has("access_token") ? "hash" : "search"
            });
            
            try {
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              });
              
              if (error) {
                recordDebugInfo("set_session_error", { error: error.message });
                console.error("[MainGallery] Error setting session:", error);
                throw error;
              }
              
              if (data.session) {
                recordDebugInfo("session_set_success", {
                  user: data.session.user.email,
                  expiresAt: data.session.expires_at
                });
                
                localStorage.setItem("main_gallery_user_email", data.session.user.email || "User");
                localStorage.setItem("main_gallery_user_id", data.session.user.id);
                success = true;
              }
            } catch (err) {
              console.error("[MainGallery] Error processing tokens:", err);
              recordDebugInfo("token_processing_error", { error: err.message });
            }
          }
        } else {
          // Check if we already have a valid session
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            recordDebugInfo("get_session_error", { error: sessionError.message });
            console.error("[MainGallery] Error getting session:", sessionError);
          } else if (sessionData.session) {
            recordDebugInfo("existing_session_found", {
              user: sessionData.session.user.email
            });
            success = true;
          }
        }
        
        // Double-check we have a valid user
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          recordDebugInfo("get_user_error", { error: userError.message });
          console.error("[MainGallery] Error getting user:", userError);
        } else if (userData.user) {
          recordDebugInfo("user_verified", {
            user: userData.user.email
          });
          success = true;
        }
        
        // Clean the URL if we have tokens
        if (success && (window.location.hash || window.location.search.includes("access_token"))) {
          if (window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
            recordDebugInfo("url_cleaned", { action: "hash_removed" });
          }
        }
        
        // Handle extension auth flow
        if (isFromExtension && success) {
          try {
            console.log("[MainGallery] Notifying about successful login");
            
            // Send a message to the extension via postMessage
            window.postMessage({
              type: "WEB_APP_TO_EXTENSION",
              action: "loginSuccess",
              email: userData.user?.email || "User",
              timestamp: Date.now()
            }, "*");
            
            recordDebugInfo("extension_notified");
            
            // If this is a popup window, don't redirect
            if (window.opener) {
              return;
            }
            
            // Try to use chrome messaging API if available
            if (typeof window !== "undefined" && window.chrome && window.chrome.runtime) {
              const currentToken = accessToken;
              
              window.chrome.runtime.sendMessage(
                undefined,
                {
                  type: "WEB_APP_TO_EXTENSION",
                  action: "loginSuccess",
                  email: userData.user?.email || "User", 
                  token: currentToken,
                  timestamp: Date.now()
                },
                (response) => {
                  console.log("[MainGallery] Message sent to extension, response:", response);
                }
              );
            }
            
            // Show success message for extension users
            setStatus("Login successful! You can close this tab now.");
            toast({
              title: "Login Successful",
              description: "You can now close this window and return to the extension."
            });
            
            // Auto-close if this is a popup
            setTimeout(() => {
              if (window.opener) {
                window.close();
              }
            }, 2000);
            
            return;
          } catch (e) {
            console.error("[MainGallery] Error sending message to extension:", e);
          }
        }
        
        // Handle web app auth flow
        if (success) {
          setStatus("Login successful! Redirecting...");
          toast({
            title: "Login Successful",
            description: "You've been logged in successfully!"
          });
          
          setTimeout(() => {
            navigate("/gallery");
          }, 800);
        } else {
          console.error("[MainGallery] Failed to establish session");
          setStatus("Authentication error");
          setError("Failed to establish a session. Please try logging in again.");
          
          toast({
            title: "Authentication Error",
            description: "Failed to establish a session. Please try logging in again.",
            variant: "destructive"
          });
          
          setTimeout(() => navigate("/auth"), 2000);
        }
      } catch (err) {
        recordDebugInfo("auth_process_error", { error: err.message });
        console.error("[MainGallery] Error during auth callback processing:", err);
        
        setStatus("Authentication error");
        setError("An error occurred during login. Please try again.");
        
        toast({
          title: "Authentication Error",
          description: "An error occurred during login. Please try again.",
          variant: "destructive"
        });
        
        setTimeout(() => navigate("/auth"), 3000);
      }
    };
    
    completeAuth();
  }, [navigate, toast, setStatus, setError]);

  return (
    <div>
      <div id="auth-debug-info" style={{ display: "none" }}>
        <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
      </div>
    </div>
  );
};

export default AuthCallbackHandler;
