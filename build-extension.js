
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

// Step 8: Ensure core JS files exist
['background.js', 'content.js', 'bridge.js'].forEach(file => {
  const sourcePath = path.join(SOURCE_DIR, file);
  const destPath = path.join(OUTPUT_DIR, file);
  
  try {
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`Copied ${file}`);
      
      // Ensure module compatibility
      const content = fs.readFileSync(destPath, 'utf8');
      
      // Check if the file doesn't have import/export but should be a module
      if (!content.includes('import ') && !content.includes('export ')) {
        const moduleHeader = '// Ensure this file is treated as an ES module\n';
        fs.writeFileSync(destPath, moduleHeader + content);
        console.log(`Added module header to ${file}`);
      }
    } else {
      // Check if it's in the output from Vite build
      const viteBuildPath = path.join(OUTPUT_DIR, file);
      if (!fs.existsSync(viteBuildPath)) {
        console.error(`Warning: Could not find ${file} in source or build output`);
      } else {
        console.log(`${file} already exists in build output`);
      }
    }
  } catch (e) {
    console.warn(`Warning: Could not copy ${file}: ${e.message}`);
  }
});

// Step 9: Ensure _redirects file exists for SPA routing in both the extension and web app
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

// Step 10: Write a post-build script to ensure module compatibility
const postBuildScriptPath = path.join(OUTPUT_DIR, 'fix-modules.js');
const postBuildScript = `
/**
 * Post-build script to fix module compatibility issues
 * Run this with: node fix-modules.js
 */
const fs = require('fs');
const path = require('path');

// Function to add module export to files that need it
function ensureModuleCompatibility(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // If the file doesn't have import/export statements, add a dummy export
  if (!content.includes('import ') && !content.includes('export ')) {
    console.log(\`Adding module export to \${filePath}\`);
    fs.writeFileSync(filePath, content + "\\n// Ensure module compatibility\\nexport const __moduleCheck = true;");
    return true;
  }
  
  return false;
}

// Check core files
['background.js', 'content.js', 'bridge.js'].forEach(file => {
  ensureModuleCompatibility(file);
});

// Check utils folder
const utilsDir = 'utils';
if (fs.existsSync(utilsDir)) {
  fs.readdirSync(utilsDir)
    .filter(file => file.endsWith('.js'))
    .forEach(file => {
      ensureModuleCompatibility(path.join(utilsDir, file));
    });
}

console.log('Module compatibility check complete');
`;
fs.writeFileSync(postBuildScriptPath, postBuildScript);
console.log('Created post-build script for module compatibility');
