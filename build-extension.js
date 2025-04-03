
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

// Ensure output directory exists
console.log('Creating extension build directory...');
if (fs.existsSync(OUTPUT_DIR)) {
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(OUTPUT_DIR);
fs.mkdirSync(`${OUTPUT_DIR}/icons`, { recursive: true });
fs.mkdirSync(`${OUTPUT_DIR}/utils`, { recursive: true });
fs.mkdirSync(`${OUTPUT_DIR}/src`, { recursive: true });
fs.mkdirSync(`${OUTPUT_DIR}/src/utils`, { recursive: true });
fs.mkdirSync(`${OUTPUT_DIR}/src/config`, { recursive: true });

// Copy manifest
console.log('Copying manifest.json...');
const manifestPath = path.join(SOURCE_DIR, 'manifest.json');
fs.copyFileSync(manifestPath, path.join(OUTPUT_DIR, 'manifest.json'));

// Copy icons
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

// Copy background script
console.log('Copying background.js...');
fs.copyFileSync(
  path.join(SOURCE_DIR, 'background.js'),
  path.join(OUTPUT_DIR, 'background.js')
);

// Copy content scripts
console.log('Copying content scripts...');
fs.copyFileSync(
  path.join(SOURCE_DIR, 'content.js'),
  path.join(OUTPUT_DIR, 'content.js')
);
fs.copyFileSync(
  path.join(SOURCE_DIR, 'bridge.js'),
  path.join(OUTPUT_DIR, 'bridge.js')
);
try {
  fs.copyFileSync(
    path.join(SOURCE_DIR, 'content-injection.js'),
    path.join(OUTPUT_DIR, 'content-injection.js')
  );
} catch (e) {
  console.warn('Warning: content-injection.js not found, skipping');
}

// Copy utility files
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

// Convert imports in files to use direct script inclusion (non-module format)
console.log('Converting module imports to vanilla JS...');

// Function to replace import statements with appropriate variable declarations
function convertImportsToVanillaJS(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove import statements and add appropriate script tags in HTML if needed
  content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"]\.\/([^'"]+)['"]/g, '// Import removed: $1 from ./$2');
  content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"]\.\.\/([^'"]+)['"]/g, '// Import removed: $1 from ../$2');
  content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"]\.\.\/utils\/([^'"]+)['"]/g, '// Import removed: $1 from ../utils/$2');
  content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"]\.\/.\/utils\/([^'"]+)['"]/g, '// Import removed: $1 from ./utils/$2');
  
  fs.writeFileSync(filePath, content, 'utf8');
}

// Update manifest.json to ensure proper configuration
console.log('Updating manifest.json for proper configuration...');
let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'manifest.json'), 'utf8'));
  
  // Ensure background script is configured correctly
  manifest.background = {
    "service_worker": "background.js",
    "type": "module"
  };
  
  // Update content scripts configuration if needed
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

console.log('Build completed successfully!');
console.log(`Extension files are ready in the '${OUTPUT_DIR}' directory`);
console.log('To load the extension in Chrome:');
console.log('1. Go to chrome://extensions/');
console.log('2. Enable "Developer mode"');
console.log('3. Click "Load unpacked" and select the dist-extension folder');
