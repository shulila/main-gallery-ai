
/**
 * Authentication configuration
 * Centralizes auth-related configuration options
 */

/**
 * Authentication configuration
 */
export const authConfig = {
  /**
   * URLs for authentication flows
   */
  urls: {
    /**
     * URL to redirect to after sign in
     */
    afterSignIn: '/gallery',
    
    /**
     * URL to redirect to after sign up
     */
    afterSignUp: '/gallery',
    
    /**
     * URL to redirect to after sign out
     */
    afterSignOut: '/',
    
    /**
     * URL for the authentication page
     */
    auth: '/auth',
    
    /**
     * URL for the authentication callback
     */
    authCallback: '/auth/callback',
  },
  
  /**
   * Google OAuth configuration
   */
  google: {
    /**
     * Client ID for Google OAuth
     */
    clientId: '648580197357-2v9sfcorca7060e4rdjr1904a4f1qa26.apps.googleusercontent.com',
  },
  
  /**
   * Session persistence configuration
   */
  session: {
    /**
     * Whether to persist the session across browser restarts
     */
    persist: true,
    
    /**
     * Session timeout in milliseconds (default: 7 days)
     */
    timeout: 7 * 24 * 60 * 60 * 1000,
  },
  
  /**
   * Validation configuration
   */
  validation: {
    /**
     * Minimum password length
     */
    minPasswordLength: 8,
    
    /**
     * Whether to require at least one uppercase letter in passwords
     */
    requireUppercase: true,
    
    /**
     * Whether to require at least one number in passwords
     */
    requireNumber: true,
  },
};
