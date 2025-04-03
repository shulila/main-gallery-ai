
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

// Copy manifest
console.log('Copying manifest.json...');
const manifestPath = path.join(SOURCE_DIR, 'manifest.json');
fs.copyFileSync(manifestPath, path.join(OUTPUT_DIR, 'manifest.json'));

// Copy icons
console.log('Copying icons...');
['icon16.png', 'icon48.png', 'icon128.png'].forEach(iconFile => {
  fs.copyFileSync(
    path.join(ICONS_DIR, iconFile), 
    path.join(OUTPUT_DIR, 'icons', iconFile)
  );
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
fs.copyFileSync(
  path.join(SOURCE_DIR, 'content-injection.js'),
  path.join(OUTPUT_DIR, 'content-injection.js')
);

// Copy utility files
console.log('Copying utility files...');
const UTILS_SOURCE = path.join(SOURCE_DIR, 'utils');
const UTILS_DEST = path.join(OUTPUT_DIR, 'utils');

fs.readdirSync(UTILS_SOURCE).forEach(file => {
  if (file.endsWith('.js')) {
    fs.copyFileSync(
      path.join(UTILS_SOURCE, file),
      path.join(UTILS_DEST, file)
    );
  }
});

// Update imports in copied files to use relative paths
console.log('Updating import paths...');
const fixImportsInFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace import paths
  content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"]\.\/([^'"]+)['"]/g, 'import {$1} from "./$2"');
  content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"]\.\.\/([^'"]+)['"]/g, 'import {$1} from "./$2"');
  content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"]\.\.\/utils\/([^'"]+)['"]/g, 'import {$1} from "./utils/$2"');
  
  fs.writeFileSync(filePath, content, 'utf8');
};

// Fix imports in background.js and content.js
fixImportsInFile(path.join(OUTPUT_DIR, 'background.js'));
fixImportsInFile(path.join(OUTPUT_DIR, 'content.js'));
fixImportsInFile(path.join(OUTPUT_DIR, 'bridge.js'));

// List all utility files and fix their imports too
fs.readdirSync(UTILS_DEST).forEach(file => {
  fixImportsInFile(path.join(UTILS_DEST, file));
});

console.log('Build completed successfully!');
console.log(`Extension files are ready in the '${OUTPUT_DIR}' directory`);
console.log('To load the extension in Chrome:');
console.log('1. Go to chrome://extensions/');
console.log('2. Enable "Developer mode"');
console.log('3. Click "Load unpacked" and select the dist-extension folder');
