
export interface UserInfo {
  sub: string;
  name: string;
  given_name?: string;
  family_name?: string;
  picture: string;
  email: string;
  email_verified?: boolean;
  locale?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  provider: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
    [key: string]: any;
  };
  app_metadata: {
    provider: string;
    [key: string]: any;
  };
}

export interface AuthSession {
  provider: string;
  provider_token: string;
  access_token: string;
  refresh_token?: string;
  expires_at: number | string;
  created_at?: number;
  updated_at?: number;
  user?: AuthUser;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: AuthUser;
}
