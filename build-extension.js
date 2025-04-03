
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

// Step 4: Copy icons
console.log('Copying icons...');
['icon16.png', 'icon48.png', 'icon128.png'].forEach(iconFile => {
  try {
    fs.copyFileSync(
      path.join(ICONS_DIR, iconFile), 
      path.join(OUTPUT_DIR, 'icons', iconFile)
    );
  } catch (e) {
    console.warn(`Warning: Could not find icon ${iconFile}, will use a placeholder`);
    // Create placeholder icon file if it doesn't exist
    if (!fs.existsSync(path.join(OUTPUT_DIR, 'icons', iconFile))) {
      fs.writeFileSync(path.join(OUTPUT_DIR, 'icons', iconFile), '');
    }
  }
});

// Step 5: Copy utility files (that might not be bundled with Vite)
console.log('Copying utility files...');
const UTILS_SOURCE = path.join(SOURCE_DIR, 'utils');
const UTILS_DEST = path.join(OUTPUT_DIR, 'utils');

try {
  fs.readdirSync(UTILS_SOURCE).forEach(file => {
    if (file.endsWith('.js')) {
      fs.copyFileSync(
        path.join(UTILS_SOURCE, file),
        path.join(UTILS_DEST, file)
      );
    }
  });
} catch (e) {
  console.warn('Warning: utils directory not found or empty');
}

// Copy files to src/utils for proper imports
try {
  fs.readdirSync(UTILS_SOURCE).forEach(file => {
    if (file.endsWith('.js')) {
      fs.copyFileSync(
        path.join(UTILS_SOURCE, file),
        path.join(OUTPUT_DIR, 'src', 'utils', file)
      );
    }
  });
} catch (e) {
  console.warn('Warning: Could not copy files to src/utils');
}

// Step 6: Ensure _redirects file exists for SPA routing in both the extension and web app
console.log('Creating _redirects file for SPA routing...');
const redirectsContent = '/*    /index.html   200';
const publicDir = 'public';

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

fs.writeFileSync(path.join(publicDir, '_redirects'), redirectsContent);
fs.writeFileSync(path.join(OUTPUT_DIR, '_redirects'), redirectsContent);
console.log('_redirects files created successfully');

// Step 7: Update manifest.json to ensure proper configuration
console.log('Updating manifest.json for proper configuration...');
let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'manifest.json'), 'utf8'));
  
  // Ensure background script is configured correctly
  manifest.background = {
    "service_worker": "background.js",
    "type": "module"
  };
  
  // Update content scripts configuration
  manifest.content_scripts = [
    {
      "matches": [
        "https://*.midjourney.com/*",
        "https://www.midjourney.com/*", 
        "https://midjourney.com/*",
        "https://*.leonardo.ai/*",
        "https://app.leonardo.ai/*",
        "https://openai.com/dall-e/*", 
        "https://dreamstudio.ai/*",
        "https://*.stability.ai/*",
        "https://*.runwayml.com/*",
        "https://*.pika.art/*",
        "https://*.playgroundai.com/*",
        "https://creator.nightcafe.studio/*",
        "https://discord.com/channels/*midjourney*"
      ],
      "js": ["content.js"],
      "run_at": "document_idle"
    },
    {
      "matches": [
        "https://main-gallery-hub.lovable.app/*",
        "https://preview-main-gallery-ai.lovable.app/*"
      ],
      "js": ["bridge.js"],
      "run_at": "document_end"
    }
  ];
  
  // Ensure web_accessible_resources are properly configured
  manifest.web_accessible_resources = [
    {
      "resources": ["content-injection.js", "icons/*", "utils/*", "src/utils/*"],
      "matches": ["<all_urls>"]
    }
  ];
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
} catch (e) {
  console.error('Error updating manifest.json:', e);
}

// Step 8: Update build-extension.sh script
const buildShScript = `#!/bin/bash
# MainGallery.AI Chrome Extension Build Script

echo "Building MainGallery.AI Chrome Extension..."
echo "Removing old build directory..."
rm -rf dist-extension

echo "Running build script..."
node build-extension.js

echo "Done! Your extension is now ready in the dist-extension folder."
echo ""
echo "To load the extension in Chrome:"
echo "1. Go to chrome://extensions/"
echo "2. Enable Developer mode (top right)"
echo "3. Click 'Load unpacked' and select the dist-extension folder"
`;

fs.writeFileSync('build-extension.sh', buildShScript);
fs.chmodSync('build-extension.sh', '755');  // Make it executable

console.log('Build completed successfully!');
console.log(`Extension files are ready in the '${OUTPUT_DIR}' directory`);
console.log('To load the extension in Chrome:');
console.log('1. Go to chrome://extensions/');
console.log('2. Enable "Developer mode"');
console.log('3. Click "Load unpacked" and select the dist-extension folder');
