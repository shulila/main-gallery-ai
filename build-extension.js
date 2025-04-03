
/**
 * MainGallery.AI Chrome Extension Build Script
 * 
 * This script organizes extension files into a proper structure for loading as an unpacked extension.
 * Run with: node build-extension.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const OUTPUT_DIR = 'dist-extension';
const SOURCE_DIR = 'src/chrome-extension';
const ICONS_DIR = `${SOURCE_DIR}/icons`;

// Step 1: Run Vite build with 'extension' mode
console.log('Building extension with Vite...');
try {
  execSync('npx vite build --mode extension', { stdio: 'inherit' });
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
fs.mkdirSync(`${OUTPUT_DIR}/src`, { recursive: true });
fs.mkdirSync(`${OUTPUT_DIR}/src/utils`, { recursive: true });
fs.mkdirSync(`${OUTPUT_DIR}/src/config`, { recursive: true });

// Step 3: Copy manifest
console.log('Copying manifest.json...');
const manifestPath = path.join(SOURCE_DIR, 'manifest.json');
fs.copyFileSync(manifestPath, path.join(OUTPUT_DIR, 'manifest.json'));

// Step 4: Copy popup files
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
    fs.copyFileSync(
      path.join(ICONS_DIR, iconFile), 
      path.join(OUTPUT_DIR, 'icons', iconFile)
    );
    console.log(`Copied icon: ${iconFile}`);
  } catch (e) {
    console.warn(`Warning: Could not find icon ${iconFile}, will use a placeholder`);
    // Create placeholder icon file if it doesn't exist
    if (!fs.existsSync(path.join(OUTPUT_DIR, 'icons', iconFile))) {
      fs.writeFileSync(path.join(OUTPUT_DIR, 'icons', iconFile), '');
    }
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
        fs.copyFileSync(
          path.join(UTILS_SOURCE, file),
          path.join(UTILS_DEST, file)
        );
        console.log(`Copied util: ${file}`);
      }
    });
  } else {
    console.warn('Warning: utils directory not found at', UTILS_SOURCE);
  }
} catch (e) {
  console.warn('Warning: utils directory not found or empty:', e.message);
}

// Copy files to src/utils for proper imports
try {
  if (fs.existsSync(UTILS_SOURCE)) {
    const utilFiles = fs.readdirSync(UTILS_SOURCE);
    utilFiles.forEach(file => {
      if (file.endsWith('.js')) {
        fs.copyFileSync(
          path.join(UTILS_SOURCE, file),
          path.join(OUTPUT_DIR, 'src', 'utils', file)
        );
        console.log(`Copied util to src/utils: ${file}`);
      }
    });
  }
} catch (e) {
  console.warn('Warning: Could not copy files to src/utils:', e.message);
}

// Step 7: Copy content-injection.js if it exists
const contentInjectionSource = path.join(SOURCE_DIR, 'content-injection.js');
if (fs.existsSync(contentInjectionSource)) {
  fs.copyFileSync(
    contentInjectionSource,
    path.join(OUTPUT_DIR, 'content-injection.js')
  );
  console.log('Copied content-injection.js');
}

// Step 8: Ensure _redirects file exists for SPA routing in both the extension and web app
console.log('Creating _redirects file for SPA routing...');
const redirectsContent = '/*    /index.html   200';
const publicDir = 'public';

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

fs.writeFileSync(path.join(publicDir, '_redirects'), redirectsContent);
fs.writeFileSync(path.join(OUTPUT_DIR, '_redirects'), redirectsContent);
console.log('_redirects files created successfully');

console.log('Build completed successfully!');
console.log(`Extension files are ready in the '${OUTPUT_DIR}' directory`);
console.log('To load the extension in Chrome:');
console.log('1. Go to chrome://extensions/');
console.log('2. Enable "Developer mode"');
console.log('3. Click "Load unpacked" and select the dist-extension folder');
