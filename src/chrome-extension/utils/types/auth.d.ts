
interface AuthResult {
  success: boolean;
  error?: string;
  user?: any;
}

interface UserInfo {
  sub: string;
  email: string;
  name: string;
  picture: string;
}

interface AuthSession {
  provider: string;
  provider_token: string;
  access_token: string;
  expires_at: number;
  user: any;
  created_at: number;
}
