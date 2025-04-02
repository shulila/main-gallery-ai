
/**
 * Image extraction utilities for MainGallery.AI
 */

import { logger } from './logger.js';
import { handleError } from './errorHandler.js';
import { getPlatformIdFromUrl } from './urlUtils.js';
import { getImageSelectorsForPlatform, extractPromptFromImage, generateUniqueId } from './domUtils.js';

/**
 * Extract images from page with improved detection
 * @returns {Object} Extraction results with images array
 */
export function extractImages() {
  try {
    logger.log('Starting image extraction...');
    
    // Try to use the injection method first if available
    if (window.__MAINGALLERY__ && typeof window.__MAINGALLERY__.extractAIImages === 'function') {
      logger.log('Using injection script to extract images');
      const result = window.__MAINGALLERY__.extractAIImages();
      logger.log(`Used injection script to extract ${result.images?.length || 0} images`);
      return { 
        images: result.images || [], 
        success: result.images && result.images.length > 0 
      };
    }
    
    // Fallback to direct DOM extraction
    logger.log('Falling back to direct DOM extraction method');
    const extractedImages = extractImagesFromPage();
    logger.log(`Direct DOM extraction found ${extractedImages.length} images`);
    
    return { 
      images: extractedImages, 
      success: true 
    };
  } catch (err) {
    handleError('extractImages', err);
    // Still try DOM extraction as last resort
    try {
      const extractedImages = extractImagesFromPage();
      logger.log(`Fallback extraction found ${extractedImages.length} images after error`);
      return { 
        images: extractedImages, 
        success: true 
      };
    } catch (finalError) {
      handleError('extractImagesFinalFallback', finalError);
      return { images: [], success: false, error: finalError.message };
    }
  }
}

/**
 * Extract images directly from DOM with improved platform-specific detection
 * @returns {Array} Array of extracted image objects
 */
export function extractImagesFromPage() {
  logger.log('Using direct DOM extraction method');
  
  const images = [];
  const extractedUrls = new Set();
  let processedCount = 0;
  let skippedCount = 0;
  let smallImageCount = 0;
  let dataUrlCount = 0;

  // Determine platform from hostname
  const platform = getPlatformIdFromUrl(window.location.href);
  const isMidjourney = platform === 'midjourney';
  
  // Get appropriate selectors for this platform
  const selectors = getImageSelectorsForPlatform(platform);
  
  // Collect images from all selectors
  let allImages = [];
  
  selectors.forEach(selector => {
    try {
      const found = document.querySelectorAll(selector);
      if (found && found.length > 0) {
        logger.log(`Found ${found.length} images using selector: ${selector}`);
        allImages = [...allImages, ...Array.from(found)];
      }
    } catch (err) {
      handleError(`extractImagesFromPage-selector-${selector}`, err, { silent: true });
    }
  });
  
  // Remove duplicates from allImages
  allImages = Array.from(new Set(allImages));
  
  logger.log(`Processing ${allImages.length} images (${platform} platform)`);
  
  // Debug: log some sample images for troubleshooting
  if (allImages.length > 0) {
    logger.log('Sample image details:');
    const sampleSize = Math.min(3, allImages.length);
    for (let i = 0; i < sampleSize; i++) {
      const img = allImages[i];
      logger.log(`Sample ${i+1}:`, {
        src: img.src ? img.src.substring(0, 50) + '...' : 'no src',
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        classes: img.className,
        alt: img.alt || 'no alt'
      });
    }
  }
  
  allImages.forEach((img) => {
    processedCount++;
    
    // Debug image properties
    const imgWidth = img.naturalWidth || img.width;
    const imgHeight = img.naturalHeight || img.height;
    const src = img.src;
    const alt = img.alt || '';
    const classes = img.className || '';
    
    if (processedCount % 20 === 0 || processedCount <= 5) {
      logger.log(`Examining image ${processedCount}/${allImages.length}: ${src ? src.substring(0, 50) + '...' : 'no src'}`);
      logger.log(`  - Size: ${imgWidth}x${imgHeight}, Alt: "${alt.substring(0, 30)}...", Class: ${classes}`);
    }
    
    // Skip if already extracted, no src, too small, or data URL
    if (!src) {
      logger.log(`Skipping image with no src`);
      return;
    }
    
    if (extractedUrls.has(src)) {
      skippedCount++;
      if (skippedCount % 20 === 0) logger.log(`Skipped ${skippedCount} duplicate images so far`);
      return;
    }
    
    if (src.startsWith('data:')) {
      dataUrlCount++;
      if (dataUrlCount % 20 === 0) logger.log(`Skipped ${dataUrlCount} data: URL images so far`);
      return;
    }
    
    // Special handling for Midjourney - don't filter by size for Midjourney images
    const minSize = isMidjourney ? 50 : 200; // Much smaller minimum for Midjourney
    
    if (imgWidth < minSize && imgHeight < minSize) {
      smallImageCount++;
      if (smallImageCount % 20 === 0) logger.log(`Skipped ${smallImageCount} small images so far`);
      return;
    }
    
    // Get prompt from alt text or nearby elements
    const prompt = extractPromptFromImage(img, platform);
    
    // Create image object with unique ID
    const uniqueId = generateUniqueId();
    
    images.push({
      id: uniqueId,
      url: src,
      prompt: prompt,
      platform: platform,
      sourceURL: window.location.href,
      timestamp: Date.now(),
      type: 'image',
      width: imgWidth,
      height: imgHeight
    });
    
    extractedUrls.add(src);
  });

  logger.log(`Image extraction summary:
- Total processed: ${processedCount}
- Extracted: ${images.length}
- Skipped duplicates: ${skippedCount}
- Skipped small images: ${smallImageCount}
- Skipped data URLs: ${dataUrlCount}
`);
  
  return images;
}
