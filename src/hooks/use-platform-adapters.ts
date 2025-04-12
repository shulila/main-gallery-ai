
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createPlatformAdapter, PlatformAdapter } from '@/integrations/platforms/adapter';

/**
 * Custom hook for managing platform adapters
 * This centralizes the logic for platform connections and provides a consistent interface
 */
export function usePlatformAdapters() {
  const [adapters, setAdapters] = useState<Record<string, PlatformAdapter>>({});
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Initialize adapters when user changes
  useEffect(() => {
    const initializeAdapters = async () => {
      if (!user) {
        setAdapters({});
        setIsInitializing(false);
        return;
      }

      setIsInitializing(true);
      setError(null);

      try {
        // Define supported platforms
        const platformNames = ['Midjourney', 'DALL-E', 'Leonardo']; // Add all 53 platforms
        const newAdapters: Record<string, PlatformAdapter> = {};

        // Create adapters for each platform
        for (const platformName of platformNames) {
          try {
            const adapter = createPlatformAdapter(platformName, user.id);
            newAdapters[platformName] = adapter;
          } catch (err) {
            console.error(`Error creating adapter for ${platformName}:`, err);
          }
        }

        setAdapters(newAdapters);
      } catch (err) {
        console.error('Error initializing platform adapters:', err);
        setError('Failed to initialize platform connections');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAdapters();
  }, [user]);

  /**
   * Get all supported platform names
   */
  const getSupportedPlatforms = useCallback((): string[] => {
    return Object.keys(adapters);
  }, [adapters]);

  /**
   * Get adapter for a specific platform
   */
  const getAdapter = useCallback((platformName: string): PlatformAdapter | null => {
    return adapters[platformName] || null;
  }, [adapters]);

  /**
   * Connect to a platform
   */
  const connectToPlatform = useCallback(async (platformName: string): Promise<boolean> => {
    const adapter = adapters[platformName];
    if (!adapter) {
      console.error(`No adapter found for platform: ${platformName}`);
      return false;
    }

    try {
      return await adapter.connect();
    } catch (err) {
      console.error(`Error connecting to ${platformName}:`, err);
      return false;
    }
  }, [adapters]);

  /**
   * Disconnect from a platform
   */
  const disconnectFromPlatform = useCallback(async (platformName: string): Promise<boolean> => {
    const adapter = adapters[platformName];
    if (!adapter) {
      console.error(`No adapter found for platform: ${platformName}`);
      return false;
    }

    try {
      return await adapter.disconnect();
    } catch (err) {
      console.error(`Error disconnecting from ${platformName}:`, err);
      return false;
    }
  }, [adapters]);

  /**
   * Check if connected to a platform
   */
  const isPlatformConnected = useCallback(async (platformName: string): Promise<boolean> => {
    const adapter = adapters[platformName];
    if (!adapter) {
      return false;
    }

    try {
      return await adapter.isConnected();
    } catch (err) {
      console.error(`Error checking connection to ${platformName}:`, err);
      return false;
    }
  }, [adapters]);

  /**
   * Fetch images from a platform
   */
  const fetchImagesFromPlatform = useCallback(async (platformName: string, limit?: number) => {
    const adapter = adapters[platformName];
    if (!adapter) {
      console.error(`No adapter found for platform: ${platformName}`);
      return [];
    }

    try {
      return await adapter.fetchImages(limit);
    } catch (err) {
      console.error(`Error fetching images from ${platformName}:`, err);
      return [];
    }
  }, [adapters]);

  /**
   * Fetch images from all connected platforms
   */
  const fetchImagesFromAllPlatforms = useCallback(async (limit?: number) => {
    const allImages = [];
    const platformNames = Object.keys(adapters);

    for (const platformName of platformNames) {
      try {
        const isConnected = await isPlatformConnected(platformName);
        if (isConnected) {
          const images = await fetchImagesFromPlatform(platformName, limit);
          allImages.push(...images);
        }
      } catch (err) {
        console.error(`Error fetching images from ${platformName}:`, err);
      }
    }

    return allImages;
  }, [adapters, fetchImagesFromPlatform, isPlatformConnected]);

  return {
    isInitializing,
    error,
    getSupportedPlatforms,
    getAdapter,
    connectToPlatform,
    disconnectFromPlatform,
    isPlatformConnected,
    fetchImagesFromPlatform,
    fetchImagesFromAllPlatforms
  };
}
