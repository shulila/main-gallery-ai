interface AuthSession {
  provider: string;
  provider_token: string;
  access_token: string;
  expires_at: number;
  created_at: number;
  user?: AuthUser;
}

interface AuthUser {
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

interface AuthResult {
  success: boolean;
  error?: string;
  user?: AuthUser;
}

interface CookieConfig {
  DOMAIN: string;
  NAMES: {
    SESSION: string;
    AUTH_STATE: string;
    USER: string;
  };
}

interface WebAppUrls {
  BASE: string;
  GALLERY: string;
  AUTH: string;
}

interface AuthTimeouts {
  LOGIN_TIMEOUT: number;
  AUTH_SYNC_INTERVAL: number;
}

interface AuthConfig {
  WEB_APP_URLS: WebAppUrls;
  COOKIE_CONFIG: CookieConfig;
  AUTH_TIMEOUTS: AuthTimeouts;
}
