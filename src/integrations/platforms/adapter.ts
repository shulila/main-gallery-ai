
import { GalleryImage } from '@/types/gallery';

/**
 * Interface for platform-specific adapters
 * This provides a consistent interface for all platform integrations
 */
export interface PlatformAdapter {
  /**
   * The name of the platform
   */
  platformName: string;
  
  /**
   * Connect to the platform
   * @returns Promise resolving to success status
   */
  connect(): Promise<boolean>;
  
  /**
   * Disconnect from the platform
   * @returns Promise resolving to success status
   */
  disconnect(): Promise<boolean>;
  
  /**
   * Check if connected to the platform
   * @returns Promise resolving to connection status
   */
  isConnected(): Promise<boolean>;
  
  /**
   * Fetch images from the platform
   * @param limit Optional limit on number of images to fetch
   * @returns Promise resolving to array of gallery images
   */
  fetchImages(limit?: number): Promise<GalleryImage[]>;
  
  /**
   * Get the platform's authentication URL
   * @returns The URL to redirect to for authentication
   */
  getAuthUrl(): string;
  
  /**
   * Handle authentication callback
   * @param url The callback URL with auth tokens
   * @returns Promise resolving to success status
   */
  handleAuthCallback(url: string): Promise<boolean>;
}

/**
 * Abstract base class for platform adapters
 * Provides common functionality for all platform adapters
 */
export abstract class BasePlatformAdapter implements PlatformAdapter {
  protected userId: string | null = null;
  
  constructor(
    public readonly platformName: string,
    protected readonly clientId: string,
    protected readonly redirectUri: string
  ) {}
  
  /**
   * Set the user ID for the adapter
   * @param userId The user ID to set
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }
  
  /**
   * Get the storage key for this platform and user
   * @returns The storage key
   */
  protected getStorageKey(): string {
    if (!this.userId) {
      throw new Error('User ID not set');
    }
    return `platform_${this.platformName.toLowerCase()}_${this.userId}`;
  }
  
  /**
   * Store authentication data
   * @param data The data to store
   */
  protected storeAuthData(data: Record<string, any>): void {
    try {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(data));
    } catch (error) {
      console.error(`Error storing auth data for ${this.platformName}:`, error);
    }
  }
  
  /**
   * Retrieve authentication data
   * @returns The stored authentication data or null if not found
   */
  protected getAuthData(): Record<string, any> | null {
    try {
      const data = localStorage.getItem(this.getStorageKey());
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error retrieving auth data for ${this.platformName}:`, error);
      return null;
    }
  }
  
  /**
   * Clear authentication data
   */
  protected clearAuthData(): void {
    try {
      localStorage.removeItem(this.getStorageKey());
    } catch (error) {
      console.error(`Error clearing auth data for ${this.platformName}:`, error);
    }
  }
  
  /**
   * Abstract methods to be implemented by specific platform adapters
   */
  abstract connect(): Promise<boolean>;
  abstract disconnect(): Promise<boolean>;
  abstract isConnected(): Promise<boolean>;
  abstract fetchImages(limit?: number): Promise<GalleryImage[]>;
  abstract getAuthUrl(): string;
  abstract handleAuthCallback(url: string): Promise<boolean>;
}

/**
 * Factory function to create platform adapters
 * @param platformName The name of the platform
 * @param userId The user ID
 * @returns A platform adapter instance
 */
export function createPlatformAdapter(
  platformName: string,
  userId: string
): PlatformAdapter {
  // Import platform adapters dynamically to avoid circular dependencies
  const { MidjourneyAdapter } = require('./midjourney');
  const { DalleAdapter } = require('./dalle');
  const { LeonardoAdapter } = require('./leonardo');
  // Import all 53 platform adapters here
  
  // Common configuration
  const redirectUri = `${window.location.origin}/auth/callback`;
  
  // Create the appropriate adapter based on platform name
  switch (platformName.toLowerCase()) {
    case 'midjourney':
      const midjourneyAdapter = new MidjourneyAdapter(
        'midjourney-client-id', // Replace with actual client ID from environment
        redirectUri
      );
      midjourneyAdapter.setUserId(userId);
      return midjourneyAdapter;
      
    case 'dalle':
      const dalleAdapter = new DalleAdapter(
        'dalle-client-id', // Replace with actual client ID from environment
        redirectUri
      );
      dalleAdapter.setUserId(userId);
      return dalleAdapter;
      
    // Add cases for all 53 platforms
      
    default:
      throw new Error(`Unsupported platform: ${platformName}`);
  }
}
