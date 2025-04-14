
export interface AuthResult {
  success: boolean;
  error?: string;
  user?: AuthUser;
}

export interface UserInfo {
  sub: string;
  email: string;
  name: string;
  picture: string;
}

export interface AuthSession {
  provider: string;
  provider_token: string;
  access_token: string;
  expires_at: number;
  user: AuthUser;
  created_at: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  provider: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
  app_metadata?: {
    provider?: string;
  };
}
