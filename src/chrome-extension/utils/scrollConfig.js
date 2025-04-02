
/**
 * Configuration for auto-scrolling behavior
 */

export const scrollConfig = {
  // Maximum number of scroll attempts
  maxScrollAttempts: 50,
  
  // Delay between scroll attempts (ms)
  scrollDelay: 500,
  
  // How far to scroll on each step (px)
  scrollStep: 800,
  
  // Minimum height change to consider still loading (px)
  heightThreshold: 50,
  
  // Extended wait period every N scrolls (ms)
  extendedWaitPeriod: 1500,
  
  // How often to trigger extended wait (every N scrolls)
  extendedWaitFrequency: 10,
  
  // Timeout for the entire scroll operation (ms)
  totalTimeout: 60000 // 1 minute max
};
