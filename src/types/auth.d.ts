
interface AuthSession {
  provider: string;
  token: string;
  expires_at: string;
  created_at: string;
}

interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  provider: string;
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
