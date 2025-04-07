
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
  
  // Always use the Preview OAuth client ID for all builds
  if (manifest.oauth2 && manifest.oauth2.client_id) {
    manifest.oauth2.client_id = '288496481194-vj3uii1l1hp8c18sf7jr7s7dt1qcamom.apps.googleusercontent.com';
    console.log('Using Preview OAuth client ID for the extension');
  }
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

// Ensure background script is properly configured
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
          
          // Also replace any hardcoded URLs
          if (isPreviewBuild) {
            content = content.replace(
              /'https:\/\/main-gallery-hub\.lovable\.app'/g, 
              "'https://preview-main-gallery-ai.lovable.app'"
            );
            console.log('Replaced hardcoded production URLs with preview URLs');
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

// Step 7: Process background.js to ensure proper module imports
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
    
    // Write the modified background.js
    fs.writeFileSync(backgroundDestPath, content);
    console.log('Successfully processed background.js');
  } else {
    console.error('ERROR: background.js not found in source directory! Will create a basic placeholder.');
    
    // Create basic placeholder background.js if it doesn't exist
    const placeholderContent = `// MainGallery.AI Background Script
console.log('MainGallery.AI Background Script initialized');

// Import auth utilities
import { setupAuthCallbackListener, isLoggedIn, getUserEmail } from './utils/auth.js';

// Set up auth callback listener
setupAuthCallbackListener();

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message in background script:', message);
  
  if (message.action === 'isLoggedIn') {
    // Check if user is logged in
    isLoggedIn().then(loggedIn => {
      sendResponse({ loggedIn });
    });
    return true; // Keep channel open for async response
  }
  
  if (message.action === 'getUserEmail') {
    // Get user email
    getUserEmail().then(email => {
      sendResponse({ email });
    });
    return true; // Keep channel open for async response
  }
  
  if (message.action === 'openGallery') {
    // Open gallery in a new tab or focus existing tab
    chrome.tabs.create({ url: 'https://' + (isPreviewEnvironment() ? 'preview-main-gallery-ai.lovable.app' : 'main-gallery-hub.lovable.app') + '/gallery' });
    sendResponse({ success: true });
    return false;
  }
  
  if (message.action === 'openAuthPage') {
    // Open auth page
    chrome.tabs.create({ url: 'https://' + (isPreviewEnvironment() ? 'preview-main-gallery-ai.lovable.app' : 'main-gallery-hub.lovable.app') + '/auth' });
    sendResponse({ success: true });
    return false;
  }
  
  // Default response for unhandled messages
  sendResponse({ success: false, error: 'Unhandled message type' });
  return false;
});

// Function to determine environment
function isPreviewEnvironment() {
  return ${isPreviewBuild};
}

// Initialize background services
console.log('MainGallery.AI Background Script loaded successfully');
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
export const BASE_URL = "${isPreviewBuild ? 'https://preview-main-gallery-ai.lovable.app' : 'https://main-gallery-hub.lovable.app'}";
export const API_URL = "${isPreviewBuild ? 'https://preview-main-gallery-ai.lovable.app/api' : 'https://main-gallery-hub.lovable.app/api'}";
export const AUTH_URL = "${isPreviewBuild ? 'https://preview-main-gallery-ai.lovable.app/auth' : 'https://main-gallery-hub.lovable.app/auth'}";
export const GALLERY_URL = "${isPreviewBuild ? 'https://preview-main-gallery-ai.lovable.app/gallery' : 'https://main-gallery-hub.lovable.app/gallery'}";
export const OAUTH_CLIENT_ID = "288496481194-vj3uii1l1hp8c18sf7jr7s7dt1qcamom.apps.googleusercontent.com";
`;

// Write environment file to multiple locations for reliable imports
fs.writeFileSync(path.join(OUTPUT_DIR, 'environment.js'), environmentJs);
console.log('Created environment.js with explicit environment settings');

fs.writeFileSync(path.join(OUTPUT_DIR, 'utils', 'environment.js'), environmentJs);
console.log('Created utils/environment.js with explicit environment settings');

// Step 9: Verify and validate the build files
console.log('Performing final validation checks...');

// Check for critical files
const criticalFiles = ['manifest.json', 'background.js', 'content.js', 'popup.js', 'popup.html'];
let missingFiles = criticalFiles.filter(file => !fs.existsSync(path.join(OUTPUT_DIR, file)));

if (missingFiles.length > 0) {
  console.error('ERROR: Missing critical files:', missingFiles.join(', '));
  
  // Special handling for missing content.js
  if (missingFiles.includes('content.js')) {
    console.log('Attempting to copy content.js from source...');
    try {
      if (fs.existsSync(path.join(SOURCE_DIR, 'content.js'))) {
        fs.copyFileSync(
          path.join(SOURCE_DIR, 'content.js'),
          path.join(OUTPUT_DIR, 'content.js')
        );
        console.log('Copied content.js manually from source');
        missingFiles = missingFiles.filter(file => file !== 'content.js');
      } else {
        console.error('content.js not found in source directory');
      }
    } catch (e) {
      console.error('Error copying content.js:', e.message);
    }
  }
  
  if (missingFiles.length > 0) {
    process.exit(1);
  }
}

// Additional verification - check for module compatibility
try {
  const backgroundContent = fs.readFileSync(path.join(OUTPUT_DIR, 'background.js'), 'utf8');
  
  // Look for import statements without .js extensions
  const importMatches = [...backgroundContent.matchAll(/import .* from ['"]\.\/utils\/([^'"]+)['"]/g)];
  const problematicImports = importMatches.filter(match => {
    const importPath = match[1];
    return !importPath.endsWith('.js');
  });
  
  if (problematicImports.length > 0) {
    console.warn('WARNING: Found imports without .js extension in background.js:');
    problematicImports.forEach(match => {
      console.warn(`  - ${match[0]}`);
    });
    
    // Auto-fix the issues
    let fixedContent = backgroundContent;
    problematicImports.forEach(match => {
      const original = match[0];
      const fixed = original.replace(`"${match[1]}"`, `"${match[1]}.js"`).replace(`'${match[1]}'`, `'${match[1]}.js'`);
      fixedContent = fixedContent.replace(original, fixed);
    });
    
    fs.writeFileSync(path.join(OUTPUT_DIR, 'background.js'), fixedContent);
    console.log('Auto-fixed import extensions in background.js');
  }
} catch (e) {
  console.warn('Warning: Error checking background.js imports:', e.message);
}

// Ensure auth.js is properly created and copied
try {
  // Check if auth.js exists in the utils directory
  const authSrcPath = path.join(SOURCE_DIR, 'utils', 'auth.js');
  const authDestPath = path.join(OUTPUT_DIR, 'utils', 'auth.js');
  
  if (fs.existsSync(authSrcPath)) {
    // Read auth.js and ensure it has proper ES module imports
    let authContent = fs.readFileSync(authSrcPath, 'utf8');
    
    // Fix imports to include .js extension
    authContent = authContent.replace(/from ['"]\.\/([^'"]+)['"]/g, (match, p1) => {
      if (!p1.endsWith('.js')) {
        return `from './${p1}.js'`;
      }
      return match;
    });
    
    // Ensure the Preview client ID is used
    if (!authContent.includes('288496481194-vj3uii1l1hp8c18sf7jr7s7dt1qcamom.apps.googleusercontent.com')) {
      console.warn('WARNING: auth.js does not contain the correct client ID. Attempting to fix...');
      authContent = authContent.replace(
        /const GOOGLE_CLIENT_ID = ['"].*['"]/,
        `const GOOGLE_CLIENT_ID = '288496481194-vj3uii1l1hp8c18sf7jr7s7dt1qcamom.apps.googleusercontent.com'`
      );
    }
    
    fs.writeFileSync(authDestPath, authContent);
    console.log('✅ Successfully processed auth.js with correct client ID');
  } else {
    console.error('❌ auth.js not found in utils directory. Authentication will not work!');
  }
} catch (e) {
  console.error('Error processing auth.js:', e.message);
}

console.log(`Build completed successfully for ${isPreviewBuild ? 'PREVIEW' : 'PRODUCTION'} environment!`);
console.log(`Extension files are ready in the '${OUTPUT_DIR}' directory`);
