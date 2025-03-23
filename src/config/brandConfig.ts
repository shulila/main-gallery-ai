
// Brand configuration
export const brandConfig = {
  // Brand identity
  name: "MainGallery",
  tagline: "Your unified gallery for AI-generated art",
  description: "Connect all your AI art platforms in one click and experience your entire creative universe in a beautifully organized gallery without any file transfers.",
  
  // URLs
  baseUrl: "https://main-gallery-hub.lovable.app",
  
  // Contact info
  email: "contact@maingallery.com",
  social: {
    twitter: "https://twitter.com/maingallery",
    github: "https://github.com/maingallery",
    linkedin: "https://linkedin.com/company/maingallery"
  },
  
  // App routes
  routes: {
    home: "/",
    auth: "/auth",
    gallery: "/gallery",
    platforms: "/platforms",
    howItWorks: "/#how-it-works" // Using a section anchor for now
  },
  
  // UI elements
  ui: {
    primaryColor: "primary", // Tailwind class name
    primaryBackground: "bg-primary",
    primaryText: "text-primary"
  }
};

// Helper function to get auth URL with redirect
export const getAuthUrlWithRedirect = (redirectPath?: string) => {
  const baseAuthUrl = `${brandConfig.baseUrl}${brandConfig.routes.auth}`;
  if (!redirectPath) return baseAuthUrl;
  return `${baseAuthUrl}?redirect=${encodeURIComponent(redirectPath)}`;
};
