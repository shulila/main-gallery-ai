
// IndexedDB Service for storing and retrieving gallery images

type GalleryImage = {
  id: string;
  url: string;
  prompt?: string;
  platform?: string;
  creationDate?: string;
  sourceURL: string;
  timestamp: number;
};

// Singleton pattern for the IndexedDB service
class GalleryIndexedDBService {
  private dbName = 'mainGalleryDB';
  private dbVersion = 1;
  private storeName = 'galleryImages';
  private db: IDBDatabase | null = null;

  // Initialize the database
  async init(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(true);
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = (event) => {
        console.error('Error opening IndexedDB', event);
        reject(new Error('Could not open IndexedDB'));
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        console.log('IndexedDB opened successfully');
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('url', 'url', { unique: false });
          store.createIndex('platform', 'platform', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('Object store created');
        }
      };
    });
  }

  // Add a batch of images to the store, avoiding duplicates
  async addImages(images: GalleryImage[]): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    // First, get existing URLs to prevent duplicates
    const existingUrls = await this.getExistingUrls();
    console.log(`Found ${existingUrls.size} existing URLs in DB`);

    // Filter out duplicates
    const uniqueImages = images.filter(img => !existingUrls.has(img.url));
    console.log(`Found ${uniqueImages.length} unique images out of ${images.length} to add to DB`);

    if (uniqueImages.length === 0) {
      console.log('No unique images to add, skipping DB write');
      return;
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      transaction.oncomplete = () => {
        console.log(`Added ${uniqueImages.length} images to IndexedDB`);
        resolve();
      };

      transaction.onerror = (event) => {
        console.error('Error adding images to IndexedDB', event);
        reject(new Error('Could not add images to IndexedDB'));
      };

      // Add each image to the store
      uniqueImages.forEach((image) => {
        try {
          store.put(image);
        } catch (error) {
          console.error('Error adding image', image, error);
        }
      });
    });
  }

  // Get all existing URLs from the database to check for duplicates
  private async getExistingUrls(): Promise<Set<string>> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const urlSet = new Set<string>();
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('url');
      const request = index.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          urlSet.add(cursor.value.url);
          cursor.continue();
        } else {
          resolve(urlSet);
        }
      };

      request.onerror = (event) => {
        console.error('Error getting existing URLs from IndexedDB', event);
        reject(new Error('Could not get existing URLs from IndexedDB'));
      };
    });
  }

  // Get all images from the store
  async getAllImages(): Promise<GalleryImage[]> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (event) => {
        console.error('Error getting images from IndexedDB', event);
        reject(new Error('Could not get images from IndexedDB'));
      };
    });
  }

  // Get images by platform
  async getImagesByPlatform(platform: string): Promise<GalleryImage[]> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('platform');
      const request = index.getAll(platform);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (event) => {
        console.error('Error getting images by platform from IndexedDB', event);
        reject(new Error('Could not get images by platform from IndexedDB'));
      };
    });
  }

  // Delete an image from the store
  async deleteImage(id: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        console.error('Error deleting image from IndexedDB', event);
        reject(new Error('Could not delete image from IndexedDB'));
      };
    });
  }

  // Clear all images from the store
  async clearImages(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        console.error('Error clearing images from IndexedDB', event);
        reject(new Error('Could not clear images from IndexedDB'));
      };
    });
  }
  
  // Export all images to JSON
  async exportToJson(): Promise<string> {
    const images = await this.getAllImages();
    return JSON.stringify(images, null, 2);
  }
}

// Export singleton instance
export const galleryDB = new GalleryIndexedDBService();
