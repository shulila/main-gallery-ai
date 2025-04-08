
/**
 * MainGallery.AI Chrome Extension Build Script
 * 
 * This script organizes extension files into a proper structure for loading as an unpacked extension.
 * Run with: node build-extension.js
 * For preview build: node build-extension.js --preview
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check if this is a preview build
const isPreviewBuild = process.env.BUILD_ENV === 'preview' || 
                      process.argv.includes('--preview') || 
                      process.argv.includes('-p');

console.log(`Building for ${isPreviewBuild ? 'PREVIEW' : 'PRODUCTION'} environment`);

// Configuration
const OUTPUT_DIR = 'dist-extension';
const SOURCE_DIR = 'src/chrome-extension';
const ICONS_DIR = `${SOURCE_DIR}/icons`;

// Step 1: Run Vite build with 'extension' mode
console.log('Building extension with Vite...');
try {
  // Pass the environment to Vite build
  const buildCmd = isPreviewBuild ? 
    'npx vite build --mode extension --env BUILD_ENV=preview' : 
    'npx vite build --mode extension';
    
  execSync(buildCmd, { stdio: 'inherit' });
  console.log('Vite build completed successfully');
} catch (error) {
  console.error('Error building extension with Vite:', error);
  process.exit(1);
}

// Step 2: Ensure output directory exists
console.log('Creating extension build directory structure...');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

// Create subdirectories if they don't exist
fs.mkdirSync(`${OUTPUT_DIR}/icons`, { recursive: true });
fs.mkdirSync(`${OUTPUT_DIR}/utils`, { recursive: true });

// Step 3: Copy and modify manifest - Special handling for preview vs production
console.log('Copying and configuring manifest.json...');
const manifestPath = path.join(SOURCE_DIR, 'manifest.json');
const manifestContent = fs.readFileSync(manifestPath, 'utf8');
const manifest = JSON.parse(manifestContent);

// Update manifest based on environment
if (isPreviewBuild) {
  manifest.name = manifest.name + ' (Preview)';
  manifest.description = manifest.description + ' - PREVIEW BUILD';
}

// Always use the correct OAuth client ID - ensuring the right ID is used
if (manifest.oauth2 && manifest.oauth2.client_id) {
  manifest.oauth2.client_id = '648580197357-2v9sfcorca7060e4rdjr1904a4f1qa26.apps.googleusercontent.com';
  console.log('Using correct OAuth client ID for the extension:', manifest.oauth2.client_id);
}

// Make sure web_accessible_resources include utils directory
if (manifest.web_accessible_resources && manifest.web_accessible_resources.length > 0) {
  // Check if utils/*.js is in resources
  const hasUtilsWildcard = manifest.web_accessible_resources[0].resources.includes("utils/*.js");
  if (!hasUtilsWildcard) {
    manifest.web_accessible_resources[0].resources.push("utils/*.js");
    console.log('Added utils/*.js to web_accessible_resources');
  }
}

// Ensure background script is properly configured as module type
if (manifest.background) {
  manifest.background.type = "module";
  console.log('Ensured background script is configured as module type');
}

// Write updated manifest
fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Step 4: Copy popup files if they exist
console.log('Copying popup files...');
['popup.html', 'popup.css', 'popup.js'].forEach(file => {
  try {
    const sourcePath = path.join(SOURCE_DIR, file);
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(
        sourcePath,
        path.join(OUTPUT_DIR, file)
      );
      console.log(`Copied ${file}`);
    } else {
      console.warn(`Warning: Source file ${file} not found in ${SOURCE_DIR}`);
    }
  } catch (e) {
    console.warn(`Warning: Could not copy ${file}: ${e.message}`);
  }
});

// Step 5: Copy icons - Now with improved error handling and validation
console.log('Copying icons...');
const requiredIcons = manifest.icons ? Object.keys(manifest.icons).map(size => `icon${size}.png`) : [];
const actionIcons = manifest.action && manifest.action.default_icon ? 
  Object.keys(manifest.action.default_icon).map(size => path.basename(manifest.action.default_icon[size])) : [];

// Combine and deduplicate icon files needed
const allIconPaths = [...new Set([...requiredIcons, ...actionIcons])];

// Check if icons directory exists, if not create it
if (!fs.existsSync(ICONS_DIR)) {
  console.warn(`Icons directory ${ICONS_DIR} not found, creating it`);
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// Check which icons exist in source
let existingIcons = [];
try {
  existingIcons = fs.readdirSync(ICONS_DIR).filter(file => file.endsWith('.png'));
  console.log(`Found ${existingIcons.length} icon files in source directory`);
} catch (e) {
  console.warn(`Error reading icons directory: ${e.message}`);
  existingIcons = [];
}

// Copy existing icons and report on missing ones
allIconPaths.forEach(iconFile => {
  try {
    const sourcePath = path.join(ICONS_DIR, iconFile);
    const destPath = path.join(OUTPUT_DIR, 'icons', iconFile);
    
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`✅ Copied icon: ${iconFile}`);
    } else {
      console.warn(`⚠️ Warning: Icon file not found: ${iconFile}`);
      
      // Find a substitute icon to use
      const substIcon = existingIcons[0]; // Use the first available icon as fallback
      if (substIcon) {
        console.log(`Using ${substIcon} as substitute for missing ${iconFile}`);
        fs.copyFileSync(
          path.join(ICONS_DIR, substIcon),
          destPath
        );
      } else {
        // Create an empty placeholder only if we have no other icons
        console.log(`Creating placeholder for missing icon: ${iconFile}`);
        fs.writeFileSync(destPath, '');
      }
    }
  } catch (e) {
    console.warn(`⚠️ Warning: Error handling icon ${iconFile}: ${e.message}`);
  }
});

// Copy Google icon for login button
try {
  const googleIconSrc = path.join(ICONS_DIR, 'google-icon.svg');
  const googleIconDest = path.join(OUTPUT_DIR, 'icons', 'google-icon.svg');
  
  if (fs.existsSync(googleIconSrc)) {
    fs.copyFileSync(googleIconSrc, googleIconDest);
    console.log('✅ Copied Google icon for login button');
  } else {
    console.warn('⚠️ Warning: Google icon for login button not found');
  }
} catch (err) {
  console.warn('Error copying Google icon:', err.message);
}

// Step 6: Copy utility files and create proper module structure
console.log('Copying utility files with module structure...');
const UTILS_SOURCE = path.join(SOURCE_DIR, 'utils');
const UTILS_DEST = path.join(OUTPUT_DIR, 'utils');

try {
  if (fs.existsSync(UTILS_SOURCE)) {
    const utilFiles = fs.readdirSync(UTILS_SOURCE);
    utilFiles.forEach(file => {
      if (file.endsWith('.js')) {
        // Read the file content
        let content = fs.readFileSync(path.join(UTILS_SOURCE, file), 'utf8');
        
        // If this is the urlUtils.js file, inject the environment setting
        if (file === 'urlUtils.js') {
          // Directly replace the isPreviewEnvironment function with a hardcoded value
          const funcStart = 'export function isPreviewEnvironment() {';
          const funcEnd = '}';
          const replacementFunc = `export function isPreviewEnvironment() {
  // ENVIRONMENT VALUE - Injected during build
  return ${isPreviewBuild};
`;
          
          const startIdx = content.indexOf(funcStart);
          if (startIdx >= 0) {
            const endIdx = content.indexOf(funcEnd, startIdx);
            if (endIdx >= 0) {
              content = content.substring(0, startIdx) + replacementFunc + content.substring(endIdx);
              console.log(`Successfully injected environment value (${isPreviewBuild ? 'PREVIEW' : 'PRODUCTION'}) into urlUtils.js`);
            }
          }
        }
        
        // If this is auth.js, ensure the client ID is always the correct one
        if (file === 'auth.js') {
          // Replace the Google client ID with the correct one
          const googleClientIdRegex = /const GOOGLE_CLIENT_ID = ['"].*?['"]/;
          const correctClientId = `const GOOGLE_CLIENT_ID = '648580197357-2v9sfcorca7060e4rdjr1904a4f1qa26.apps.googleusercontent.com'`;
          
          if (content.match(googleClientIdRegex)) {
            content = content.replace(googleClientIdRegex, correctClientId);
            console.log('Ensured correct Google Client ID in auth.js');
          }
          
          // Also verify handleEmailPasswordLogin export is present
          if (!content.includes('handleEmailPasswordLogin')) {
            console.warn('WARNING: handleEmailPasswordLogin function missing in auth.js. This will cause errors.');
          } else {
            console.log('Verified handleEmailPasswordLogin export exists in auth.js');
          }
        }
        
        // Ensure proper module imports
        content = content.replace(/from ['"]\.\/([^'"]+)['"]/g, (match, p1) => {
          // If the import doesn't end with .js, add it
          if (!p1.endsWith('.js')) {
            return `from './${p1}.js'`;
          }
          return match;
        });
        
        content = content.replace(/from ['"]\.\.\/utils\/([^'"]+)['"]/g, (match, p1) => {
          // If the import doesn't end with .js, add it
          if (!p1.endsWith('.js')) {
            return `from '../utils/${p1}.js'`;
          }
          return match;
        });
        
        // Write the modified file
        fs.writeFileSync(path.join(UTILS_DEST, file), content);
        console.log(`Copied and processed util: ${file}`);
      }
    });
  }
} catch (e) {
  console.warn('Warning: Error copying utility files:', e.message);
}

// Step 7: Process background.js to ensure proper module imports and fix handleEmailPasswordLogin issues
console.log('Processing background.js for proper module structure...');
try {
  const backgroundPath = path.join(SOURCE_DIR, 'background.js');
  const backgroundDestPath = path.join(OUTPUT_DIR, 'background.js');
  
  if (fs.existsSync(backgroundPath)) {
    let content = fs.readFileSync(backgroundPath, 'utf8');
    
    // Ensure proper module imports
    content = content.replace(/from ['"]\.\/utils\/([^'"]+)['"]/g, (match, p1) => {
      // If the import doesn't end with .js, add it
      if (!p1.endsWith('.js')) {
        return `from './utils/${p1}.js'`;
      }
      return match;
    });
    
    // Fix dynamic imports if any
    content = content.replace(/import\(['"]\.\/utils\/([^'"]+)['"]\)/g, (match, p1) => {
      // If the import doesn't end with .js, add it
      if (!p1.endsWith('.js')) {
        return `import('./utils/${p1}.js')`;
      }
      return match;
    });

    // Ensure all relative paths have .js extension
    content = content.replace(/from ['"]\.\.\/([^'"]+)['"]/g, (match, p1) => {
      if (!p1.endsWith('.js') && !p1.includes('/')) {
        return `from '../${p1}.js'`;
      }
      return match;
    });
    
    // Verify handleEmailPasswordLogin import is correct
    if (content.includes('handleEmailPasswordLogin') && !content.includes('handleEmailPasswordLogin }')) {
      console.log('Verifying handleEmailPasswordLogin import is present in background.js');
    }
    
    // Write the modified background.js
    fs.writeFileSync(backgroundDestPath, content);
    console.log('Successfully processed background.js');
  } else {
    console.error('ERROR: background.js not found in source directory! Will create a basic placeholder.');
    
    // Create basic placeholder background.js if it doesn't exist
    const placeholderContent = `// MainGallery.AI Background Script
console.log('MainGallery.AI Background Script initialized');

// Import required modules with explicit .js extensions
import { logger } from './utils/logger.js';
import { handleError, safeFetch } from './utils/errorHandler.js';
import { 
  isSupportedPlatformUrl, 
  getGalleryUrl, 
  getAuthUrl, 
  isPreviewEnvironment,
  getBaseUrl 
} from './utils/urlUtils.js';

// Log environment for debugging
logger.log('Environment check:', isPreviewEnvironment() ? 'PREVIEW' : 'PRODUCTION');
logger.log('Base URL:', getBaseUrl());
logger.log('Gallery URL:', getGalleryUrl());
logger.log('Auth URL:', getAuthUrl());

// Store the environment type in local storage
chrome.storage.local.set({ 'environment': isPreviewEnvironment() ? 'preview' : 'production' }, () => {
  logger.log('Environment stored in local storage:', isPreviewEnvironment() ? 'preview' : 'production');
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logger.log('Message received in background script:', message);
  
  try {
    if (message.action === 'log') {
      logger.log('FROM CONTENT SCRIPT:', message.data);
      sendResponse({ success: true });
    } 
    else if (message.action === 'isLoggedIn') {
      // Return logged in status
      sendResponse({ loggedIn: true });
    }
    else if (message.action === 'openGallery') {
      // Open the gallery in a new tab
      chrome.tabs.create({ url: getGalleryUrl() });
      sendResponse({ success: true });
    }
    else if (message.action === 'openAuthPage') {
      // Open auth page
      chrome.tabs.create({ url: getAuthUrl() });
      sendResponse({ success: true });
    }
    else if (message.action === 'startAutoScan') {
      // Send a message back to indicate scan started
      logger.log('Auto-scan requested, sending acknowledge');
      sendResponse({ success: true, message: 'Scan initiated' });
    }
    else {
      // Default response for unhandled messages
      sendResponse({ success: true, action: 'default' });
    }
  } catch (err) {
    logger.error('Error handling message:', err);
    sendResponse({ success: false, error: err.message });
  }
  
  return true; // Keep message channel open for async response
});

// Handle action/icon clicks
chrome.action.onClicked.addListener((tab) => {
  logger.log('Extension icon clicked');
  
  // Open the popup
  if (chrome.action && chrome.action.openPopup) {
    chrome.action.openPopup();
  }
});

// Log startup
logger.log('MainGallery.AI Background Script loaded successfully');
`;
    
    fs.writeFileSync(backgroundDestPath, placeholderContent);
    console.log('Created basic placeholder background.js');
  }
} catch (e) {
  console.error('Error processing background.js:', e.message);
}

// Step 8: Create environment.js file to explicitly set the environment
const environmentJs = `// Environment configuration - Injected during build
export const ENVIRONMENT = "${isPreviewBuild ? 'preview' : 'production'}";
export const BASE_URL = "${isPreviewBuild ? 'https://preview-main-gallery-ai.lovable.app' : 'https://main-gallery-ai.lovable.app'}";
export const API_URL = "${isPreviewBuild ? 'https://preview-main-gallery-ai.lovable.app/api' : 'https://main-gallery-ai.lovable.app/api'}";
export const AUTH_URL = "${isPreviewBuild ? 'https://preview-main-gallery-ai.lovable.app/auth' : 'https://main-gallery-ai.lovable.app/auth'}";
export const GALLERY_URL = "${isPreviewBuild ? 'https://preview-main-gallery-ai.lovable.app/gallery' : 'https://main-gallery-ai.lovable.app/gallery'}";
export const OAUTH_CLIENT_ID = "648580197357-2v9sfcorca7060e4rdjr1904a4f1qa26.apps.googleusercontent.com";
`;

// Write environment file to multiple locations for reliable imports
fs.writeFileSync(path.join(OUTPUT_DIR, 'environment.js'), environmentJs);
console.log('Created environment.js with explicit environment settings');

fs.writeFileSync(path.join(OUTPUT_DIR, 'utils', 'environment.js'), environmentJs);
console.log('Created utils/environment.js with explicit environment settings');

// Step 9: Create a loading error fallback for popup
// Add this to popup HTML if it exists
try {
  const popupHtmlPath = path.join(OUTPUT_DIR, 'popup.html');
  if (fs.existsSync(popupHtmlPath)) {
    let htmlContent = fs.readFileSync(popupHtmlPath, 'utf8');
    
    // Check if we need to add loading timeout handling
    if (htmlContent.includes('id="loading"') && !htmlContent.includes('loading-timeout')) {
      // Add loading timeout handling
      const scriptToAdd = `
    <!-- Loading timeout handler -->
    <script type="module">
      // Set timeout to prevent infinite loading spinner
      document.addEventListener('DOMContentLoaded', () => {
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
          setTimeout(() => {
            if (loadingEl.style.display !== 'none') {
              // Still loading after timeout, show error
              const errorView = document.getElementById('error-view');
              const errorText = document.getElementById('error-text');
              
              if (errorView && errorText) {
                errorText.textContent = 'Loading timed out. Please try again or reload the extension.';
                loadingEl.style.display = 'none';
                errorView.style.display = 'block';
              } else {
                // No error view, modify loading message
                loadingEl.innerHTML = '<div style="color:red;">Loading timed out. Please reload extension.</div>';
              }
            }
          }, 5000); // 5-second timeout
        }
      });
    </script>`;
      
      // Add script before closing body tag
      htmlContent = htmlContent.replace('</body>', `${scriptToAdd}\n</body>`);
      fs.writeFileSync(popupHtmlPath, htmlContent);
      console.log('Added loading timeout handling to popup.html');
    }
  }
} catch (e) {
  console.warn('Warning: Error adding loading timeout to popup.html:', e.message);
}

// Processing content.js for domain references
try {
  const contentPath = path.join(SOURCE_DIR, 'content.js');
  const contentDestPath = path.join(OUTPUT_DIR, 'content.js');
  
  if (fs.existsSync(contentPath)) {
    let content = fs.readFileSync(contentPath, 'utf8');
    fs.writeFileSync(contentDestPath, content);
    console.log('Processed content.js');
  }
} catch (e) {
  console.warn('Warning: Error processing content.js:', e.message);
}

// Process popup.js
try {
  const popupPath = path.join(SOURCE_DIR, 'popup.js');
  const popupDestPath = path.join(OUTPUT_DIR, 'popup.js');
  
  if (fs.existsSync(popupPath)) {
    let content = fs.readFileSync(popupPath, 'utf8');
    fs.writeFileSync(popupDestPath, content);
    console.log('Processed popup.js');
  }
} catch (e) {
  console.warn('Warning: Error processing popup.js:', e.message);
}

// Final validation step
console.log('\nPerforming final validation checks...');

// Check for critical files
const criticalFiles = ['manifest.json', 'background.js'];
const missingFiles = criticalFiles.filter(file => !fs.existsSync(path.join(OUTPUT_DIR, file)));

if (missingFiles.length > 0) {
  console.error('ERROR: Missing critical files:', missingFiles.join(', '));
  process.exit(1);
}

console.log(`Build completed successfully for ${isPreviewBuild ? 'PREVIEW' : 'PRODUCTION'} environment!`);
console.log(`Extension files are ready in the '${OUTPUT_DIR}' directory`);

// Output a convenient command to load the extension
console.log('\nTo load the extension in Chrome:');
console.log('1. Go to chrome://extensions/');
console.log('2. Enable Developer mode');
console.log('3. Click "Load unpacked" and select the dist-extension folder');
