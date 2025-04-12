
/**
 * Type definitions for platform adapters and integrations
 */
import { GalleryImage } from './gallery';

/**
 * Interface for platform connection status
 */
export interface PlatformConnectionStatus {
  isConnected: boolean;
  lastConnected?: number;
  error?: string;
}

/**
 * Interface for platform connection credentials
 */
export interface PlatformCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
}

/**
 * Interface for platform metadata
 */
export interface PlatformMetadata {
  name: string;
  displayName: string;
  description: string;
  logoUrl: string;
  website: string;
  authType: PlatformAuthType;
  capabilities: PlatformCapability[];
  apiVersion?: string;
}

/**
 * Enum for platform authentication types
 */
export enum PlatformAuthType {
  OAUTH = 'oauth',
  API_KEY = 'api_key',
  USERNAME_PASSWORD = 'username_password',
  NONE = 'none'
}

/**
 * Enum for platform capabilities
 */
export enum PlatformCapability {
  FETCH_IMAGES = 'fetch_images',
  GENERATE_IMAGES = 'generate_images',
  EDIT_IMAGES = 'edit_images',
  DELETE_IMAGES = 'delete_images',
  SHARE_IMAGES = 'share_images'
}

/**
 * Interface for platform adapter
 */
export interface PlatformAdapter {
  platformName: string;
  connect(): Promise<boolean>;
  disconnect(): Promise<boolean>;
  isConnected(): Promise<boolean>;
  fetchImages(limit?: number): Promise<GalleryImage[]>;
  getAuthUrl(): string;
  handleAuthCallback(url: string): Promise<boolean>;
}
