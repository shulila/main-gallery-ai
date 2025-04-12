
/**
 * Secure storage utility for sensitive data
 * Uses Chrome's storage.local with encryption for sensitive values
 */

// Use the existing logger if available
let logger = {
  error: console.error,
  log: console.log,
  warn: console.warn
};

// Try to import the extension logger if this code is running in the extension context
try {
  import('../chrome-extension/utils/logger.js').then(module => {
    logger = module.logger;
  }).catch(() => {
    // Keep using the console fallback if import fails
  });
} catch (e) {
  // Keep using the console fallback if import fails
}

// Simple encryption key (in production, use a more secure approach)
const ENCRYPTION_KEY = 'MainGallery-Secure-Storage-Key';

/**
 * Encrypt a string value
 * @param value - Value to encrypt
 * @returns Encrypted value
 */
function encrypt(value: string): string {
  try {
    // This is a simple XOR encryption for demonstration
    // In production, use a proper encryption library
    return Array.from(value)
      .map(char => 
        String.fromCharCode(char.charCodeAt(0) ^ ENCRYPTION_KEY.charCodeAt(0))
      )
      .join('');
  } catch (error) {
    logger.error('Encryption error:', error);
    return '';
  }
}

/**
 * Decrypt a string value
 * @param encryptedValue - Value to decrypt
 * @returns Decrypted value
 */
function decrypt(encryptedValue: string): string {
  try {
    // XOR decryption (same as encryption with same key)
    return Array.from(encryptedValue)
      .map(char => 
        String.fromCharCode(char.charCodeAt(0) ^ ENCRYPTION_KEY.charCodeAt(0))
      )
      .join('');
  } catch (error) {
    logger.error('Decryption error:', error);
    return '';
  }
}

// Detect if we're in a browser extension context
const isExtension = typeof window !== 'undefined' && 
                    typeof window.chrome !== 'undefined' && 
                    window.chrome.storage && 
                    window.chrome.storage.local;

/**
 * Store a value securely
 * @param key - Storage key
 * @param value - Value to store
 * @param encrypt - Whether to encrypt the value
 * @returns Promise that resolves when storage is complete
 */
export async function secureSet(
  key: string, 
  value: any, 
  shouldEncrypt = false
): Promise<void> {
  return new Promise((resolve) => {
    try {
      const storageValue = shouldEncrypt && typeof value === 'string' 
        ? encrypt(value)
        : value;
      
      if (isExtension) {
        // Use chrome.storage if available
        window.chrome?.storage?.local.set({ [key]: storageValue }, () => {
          resolve();
        });
      } else {
        // Fallback to localStorage
        localStorage.setItem(key, JSON.stringify(storageValue));
        resolve();
      }
    } catch (error) {
      logger.error(`Error storing ${key}:`, error);
      resolve();
    }
  });
}

/**
 * Retrieve a value from secure storage
 * @param key - Storage key
 * @param isEncrypted - Whether the value is encrypted
 * @returns Promise that resolves with the stored value
 */
export async function secureGet<T>(
  key: string, 
  isEncrypted = false
): Promise<T | null> {
  return new Promise((resolve) => {
    try {
      if (isExtension) {
        // Use chrome.storage if available
        window.chrome?.storage?.local.get([key], (result) => {
          if (result[key] === undefined) {
            resolve(null);
            return;
          }
          
          const value = result[key];
          
          if (isEncrypted && typeof value === 'string') {
            resolve(decrypt(value) as unknown as T);
          } else {
            resolve(value as T);
          }
        });
      } else {
        // Fallback to localStorage
        const storedValue = localStorage.getItem(key);
        if (storedValue === null) {
          resolve(null);
          return;
        }
        
        let value: any;
        try {
          value = JSON.parse(storedValue);
        } catch {
          value = storedValue;
        }
        
        if (isEncrypted && typeof value === 'string') {
          resolve(decrypt(value) as unknown as T);
        } else {
          resolve(value as T);
        }
      }
    } catch (error) {
      logger.error(`Error retrieving ${key}:`, error);
      resolve(null);
    }
  });
}

/**
 * Remove a value from secure storage
 * @param key - Storage key
 * @returns Promise that resolves when removal is complete
 */
export async function secureRemove(key: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (isExtension) {
        // Use chrome.storage if available
        window.chrome?.storage?.local.remove(key, () => {
          resolve();
        });
      } else {
        // Fallback to localStorage
        localStorage.removeItem(key);
        resolve();
      }
    } catch (error) {
      logger.error(`Error removing ${key}:`, error);
      resolve();
    }
  });
}

// For compatibility with an older API
export const secureStorage = {
  setItem: (key: string, value: string): void => {
    secureSet(key, value, false).catch(e => logger.error(e));
  },
  getItem: (key: string): string | null => {
    // This is synchronous API so we can't await the Promise
    // Just return null and let the caller use the async API if needed
    secureGet(key, false).then(value => {
      logger.log(`Retrieved ${key} using deprecated sync API`);
      return value as string | null;
    }).catch(e => logger.error(e));
    return null;
  },
  removeItem: (key: string): void => {
    secureRemove(key).catch(e => logger.error(e));
  },
  clear: (): void => {
    // Not implemented in the new API
    logger.warn('secureStorage.clear() is deprecated and not implemented');
  }
};
