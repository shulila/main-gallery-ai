
/**
 * Type definitions for authentication-related functionality
 */
import { Session, User } from '@supabase/supabase-js';

/**
 * Interface for authentication context
 */
export interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

/**
 * Interface for authentication provider props
 */
export interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Interface for authentication state
 */
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  error: string | null;
}

/**
 * Interface for authentication tokens
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

/**
 * Enum for authentication providers
 */
export enum AuthProvider {
  EMAIL = 'email',
  GOOGLE = 'google',
  GITHUB = 'github',
  FACEBOOK = 'facebook',
  TWITTER = 'twitter'
}
