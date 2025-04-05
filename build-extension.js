
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

// Remove any default_popup setting to ensure background.js handles clicks
if (manifest.action && manifest.action.default_popup) {
  delete manifest.action.default_popup;
  console.log('Removed default_popup from manifest to ensure background script handles clicks');
}

// Always ensure service worker is treated as a module
if (manifest.background) {
  manifest.background.type = "module";
}

// Make sure content scripts are correctly configured
if (manifest.content_scripts && manifest.content_scripts.length > 0) {
  manifest.content_scripts.forEach(script => {
    script.type = "module";
  });
}

// Write updated manifest
fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Step 4: Copy popup files if they exist
console.log('Copying popup files...');
['popup.html', 'popup.css', 'popup.js'].forEach(file => {
  try {
    fs.copyFileSync(
      path.join(SOURCE_DIR, file),
      path.join(OUTPUT_DIR, file)
    );
    console.log(`Copied ${file}`);
  } catch (e) {
    console.warn(`Warning: Could not copy ${file}: ${e.message}`);
  }
});

// Step 5: Copy icons
console.log('Copying icons...');
['icon16.png', 'icon48.png', 'icon128.png', 'google-icon.svg', 'facebook-icon.svg'].forEach(iconFile => {
  try {
    const sourcePath = path.join(ICONS_DIR, iconFile);
    const destPath = path.join(OUTPUT_DIR, 'icons', iconFile);
    
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`Copied icon: ${iconFile}`);
    } else {
      console.warn(`Warning: Icon file not found: ${iconFile}`);
      // Create placeholder file if it's a required icon
      if (['icon16.png', 'icon48.png', 'icon128.png'].includes(iconFile)) {
        console.log(`Creating empty placeholder for required icon: ${iconFile}`);
        fs.writeFileSync(destPath, '');
      }
    }
  } catch (e) {
    console.warn(`Warning: Error copying icon ${iconFile}: ${e.message}`);
  }
});

// Step 6: Copy utility files (that might not be bundled with Vite)
console.log('Copying utility files...');
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
        
        // Write the possibly modified file
        fs.writeFileSync(path.join(UTILS_DEST, file), content);
        console.log(`Copied util: ${file}`);
      }
    });
  }
} catch (e) {
  console.warn('Warning: Error copying utility files:', e.message);
}

// Step 7: Create environment.js file to explicitly set the environment
const environmentJs = `// Environment configuration - Injected during build
export const ENVIRONMENT = "${isPreviewBuild ? 'preview' : 'production'}";
export const BASE_URL = "${isPreviewBuild ? 'https://preview-main-gallery-ai.lovable.app' : 'https://main-gallery-hub.lovable.app'}";
export const API_URL = "${isPreviewBuild ? 'https://preview-main-gallery-ai.lovable.app/api' : 'https://main-gallery-hub.lovable.app/api'}";
export const AUTH_URL = "${isPreviewBuild ? 'https://preview-main-gallery-ai.lovable.app/auth' : 'https://main-gallery-hub.lovable.app/auth'}";
export const GALLERY_URL = "${isPreviewBuild ? 'https://preview-main-gallery-ai.lovable.app/gallery' : 'https://main-gallery-hub.lovable.app/gallery'}";
`;

// Write environment file to multiple locations for reliable imports
fs.writeFileSync(path.join(OUTPUT_DIR, 'environment.js'), environmentJs);
console.log('Created environment.js with explicit environment settings');

fs.writeFileSync(path.join(OUTPUT_DIR, 'utils', 'environment.js'), environmentJs);
console.log('Created utils/environment.js with explicit environment settings');

// Step 8: Copy core JS files
['background.js', 'content.js', 'bridge.js'].forEach(file => {
  const sourcePath = path.join(SOURCE_DIR, file);
  const destPath = path.join(OUTPUT_DIR, file);
  
  try {
    if (fs.existsSync(sourcePath)) {
      let content = fs.readFileSync(sourcePath, 'utf8');
      
      // Replace any hardcoded URLs in JS files based on environment
      if (isPreviewBuild) {
        content = content.replace(
          /['"]https:\/\/main-gallery-hub\.lovable\.app['"]/g, 
          "'https://preview-main-gallery-ai.lovable.app'"
        );
      }
      
      fs.writeFileSync(destPath, content);
      console.log(`Copied and processed ${file}`);
    } else {
      console.error(`Warning: Could not find ${file} in source directory`);
    }
  } catch (e) {
    console.warn(`Warning: Could not copy ${file}: ${e.message}`);
  }
});

// Step 9: Create _redirects file for SPA routing
console.log('Creating _redirects file for SPA routing...');
const redirectsContent = '/*    /index.html   200';
fs.writeFileSync(path.join(OUTPUT_DIR, '_redirects'), redirectsContent);
console.log('_redirects file created successfully');

// Final validation
console.log('Performing final validation checks...');

// Check for critical files
const criticalFiles = ['manifest.json', 'background.js', 'content.js', 'utils/urlUtils.js', 'utils/environment.js'];
let missingFiles = criticalFiles.filter(file => !fs.existsSync(path.join(OUTPUT_DIR, file)));

if (missingFiles.length > 0) {
  console.error('ERROR: Missing critical files:', missingFiles.join(', '));
  process.exit(1);
}

// Verify environment in urlUtils.js
try {
  const urlUtilsContent = fs.readFileSync(path.join(OUTPUT_DIR, 'utils', 'urlUtils.js'), 'utf8');
  const hasCorrectEnv = isPreviewBuild ? 
    urlUtilsContent.includes('return true') : 
    urlUtilsContent.includes('return false');
  
  if (!hasCorrectEnv) {
    console.error('WARNING: urlUtils.js may not have the correct environment setting');
  } else {
    console.log(`Environment correctly set to ${isPreviewBuild ? 'PREVIEW' : 'PRODUCTION'} in urlUtils.js`);
  }
} catch (e) {
  console.error('Error verifying urlUtils.js environment:', e.message);
}

console.log(`Build completed successfully for ${isPreviewBuild ? 'PREVIEW' : 'PRODUCTION'} environment!`);
console.log(`Extension files are ready in the '${OUTPUT_DIR}' directory`);
console.log('To load the extension in Chrome:');
console.log('1. Go to chrome://extensions/');
console.log('2. Enable "Developer mode"');
console.log('3. Click "Load unpacked" and select the dist-extension folder');
console.log('');
console.log(`IMPORTANT: This is a ${isPreviewBuild ? 'PREVIEW' : 'PRODUCTION'} build that will connect to ${isPreviewBuild ? 'preview-main-gallery-ai.lovable.app' : 'main-gallery-hub.lovable.app'}`);
