
// Brand configuration
export const brandConfig = {
  // Brand identity
  name: "MainGallery.AI",
  tagline: "Your unified gallery for AI-generated art",
  description: "Connect all your AI art platforms in one click and experience your entire creative universe in a beautifully organized gallery without any file transfers.",
  
  // URLs
  baseUrl: "https://main-gallery-ai.lovable.app",
  
  // Contact info
  email: "contact@maingallery.ai",
  social: {
    twitter: "https://twitter.com/maingalleryai",
    github: "https://github.com/maingalleryai",
    linkedin: "https://linkedin.com/company/maingalleryai"
  },
  
  // App routes
  routes: {
    home: "/",
    auth: "/auth",
    gallery: "/gallery",
    platforms: "/platforms",
    howItWorks: "/#how-it-works"
  },
  
  // UI elements
  ui: {
    primaryColor: "#8B5CF6", // Updated to purple
    primaryBackground: "bg-primary",
    primaryText: "text-primary",
    colors: {
      primary: "#8B5CF6",      // Main purple
      primaryDark: "#7C3AED",  // Hover states
      primaryLight: "#A78BFA", // Subtle elements
      primaryBg: "#F5F3FF"     // Light backgrounds
    }
  }
};

// Helper function to get auth URL with redirect
export const getAuthUrlWithRedirect = (redirectPath?: string) => {
  const baseAuthUrl = `${brandConfig.baseUrl}${brandConfig.routes.auth}`;
  if (!redirectPath) return baseAuthUrl;
  return `${baseAuthUrl}?redirect=${encodeURIComponent(redirectPath)}`;
};
