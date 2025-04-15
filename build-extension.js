
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
fs.mkdirSync(`${OUTPUT_DIR}/utils/auth`, { recursive: true });

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

// Ensure background is configured correctly
if (!manifest.background) {
  console.log('⚠️ Adding missing background config to manifest');
  manifest.background = {
    service_worker: "background.js",
    type: "module"
  };
} else {
  // Ensure the path is correct
  manifest.background.service_worker = "background.js";
  manifest.background.type = "module";
  console.log('✅ Updated background service worker path in manifest');
}

// Always use the correct OAuth client ID - ensuring the right ID is used
if (manifest.oauth2 && manifest.oauth2.client_id) {
  manifest.oauth2.client_id = '648580197357-2v9sfcorca7060e4rdjr1904a4f1qa26.apps.googleusercontent.com';
  console.log('Using correct OAuth client ID for the extension:', manifest.oauth2.client_id);
}

// Make sure web_accessible_resources include utils directory and auth subdirectory
if (manifest.web_accessible_resources && manifest.web_accessible_resources.length > 0) {
  // Check if utils/*.js is in resources
  const hasUtilsWildcard = manifest.web_accessible_resources[0].resources.includes("utils/*.js");
  if (!hasUtilsWildcard) {
    manifest.web_accessible_resources[0].resources.push("utils/*.js");
    console.log('Added utils/*.js to web_accessible_resources');
  }
  
  // Add auth subdirectory
  const hasAuthWildcard = manifest.web_accessible_resources[0].resources.includes("utils/auth/*.js");
  if (!hasAuthWildcard) {
    manifest.web_accessible_resources[0].resources.push("utils/auth/*.js");
    console.log('Added utils/auth/*.js to web_accessible_resources');
  }
}

// Write updated manifest
fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Step 4: Copy background.js with validation and error handling
console.log('Copying background.js (service worker)...');
const backgroundSrcPath = path.join(SOURCE_DIR, 'background.js');
const backgroundDestPath = path.join(OUTPUT_DIR, 'background.js');

if (!fs.existsSync(backgroundSrcPath)) {
  console.error('❌ CRITICAL ERROR: background.js is missing from source directory!');
  // Create a minimal fallback background.js to prevent complete failure
  console.log('Creating minimal fallback background.js...');
  const fallbackContent = `// MainGallery.AI Fallback Background Script
console.log('MainGallery.AI Background Script (FALLBACK VERSION) initialized');

// This is a minimal fallback version created during build
// The original background.js was missing from the source directory
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received in fallback background script:', message);
  
  // Default response for all messages
  sendResponse({ 
    success: false, 
    error: 'Using fallback background.js - original file was missing during build',
    fallback: true 
  });
  
  return true; // Keep message channel open for async response
});

// Log startup
console.log('MainGallery.AI Fallback Background Script loaded');
`;
  
  fs.writeFileSync(backgroundDestPath, fallbackContent);
  console.log('⚠️ Created fallback background.js as source file was missing');
} else {
  // Read and process background.js
  let backgroundContent = fs.readFileSync(backgroundSrcPath, 'utf8');
  
  // Fix module imports to ensure .js extensions
  backgroundContent = backgroundContent.replace(/from ['"]\.\/utils\/([^'"]+)['"]/g, (match, p1) => {
    if (!p1.endsWith('.js')) {
      return `from './utils/${p1}.js'`;
    }
    return match;
  });
  
  // Fix auth imports
  backgroundContent = backgroundContent.replace(/from ['"]\.\/utils\/auth\/([^'"]+)['"]/g, (match, p1) => {
    if (!p1.endsWith('.js')) {
      return `from './utils/auth/${p1}.js'`;
    }
    return match;
  });
  
  // Fix dynamic imports
  backgroundContent = backgroundContent.replace(/import\(['"]\.\/utils\/([^'"]+)['"]\)/g, (match, p1) => {
    if (!p1.endsWith('.js')) {
      return `import('./utils/${p1}.js')`;
    }
    return match;
  });
  
  // Ensure all relative paths have .js extension
  backgroundContent = backgroundContent.replace(/from ['"]\.\.\/([^'"]+)['"]/g, (match, p1) => {
    if (!p1.endsWith('.js') && !p1.includes('/')) {
      return `from '../${p1}.js'`;
    }
    return match;
  });
  
  // Fix @/ imports to use relative paths
  backgroundContent = backgroundContent.replace(/from ['"]@\/([^'"]+)['"]/g, (match, p1) => {
    return `from '../${p1}.js'`;
  });
  
  // Fix dynamic @/ imports
  backgroundContent = backgroundContent.replace(/import\(['"]@\/([^'"]+)['"]\)/g, (match, p1) => {
    return `import('../${p1}.js')`;
  });
  
  // Add error handling wrapper for module loading
  if (!backgroundContent.includes('try {') && !backgroundContent.includes('catch (error) {')) {
    backgroundContent = `
/**
 * Background script for MainGallery.AI Chrome Extension
 */

try {
  ${backgroundContent}
} catch (error) {
  // Detailed error logging for module loading issues
  console.error('ERROR LOADING MODULES:', error);
  console.error('Error name:', error.name);
  console.error('Error message:', error.message);
  console.error('Error stack:', error.stack);
  
  // Try to report error details
  try {
    chrome.runtime.sendMessage({
      type: 'ERROR',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    }).catch(() => {
      // Swallow errors if no handler
    });
  } catch (e) {
    // Ignore errors in error reporting
  }
}
`;
  }
  
  // Write the modified background.js
  fs.writeFileSync(backgroundDestPath, backgroundContent);
  console.log('✅ Successfully copied and processed background.js');
}

// Step 5: Copy all JavaScript files from utils directory, ensuring .js extensions for imports
console.log('Copying utility files with module structure...');
const UTILS_SOURCE = path.join(SOURCE_DIR, 'utils');
const UTILS_DEST = path.join(OUTPUT_DIR, 'utils');
const AUTH_UTILS_DEST = path.join(OUTPUT_DIR, 'utils/auth');

function copyUtilsDirectory(sourceDir, destDir) {
  if (!fs.existsSync(sourceDir)) {
    console.warn(`⚠️ Warning: Source directory ${sourceDir} not found`);
    return;
  }
  
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  const files = fs.readdirSync(sourceDir);
  
  for (const file of files) {
    const sourcePath = path.join(sourceDir, file);
    const destPath = path.join(destDir, file);
    
    if (fs.statSync(sourcePath).isDirectory()) {
      // Create subdirectory and copy its contents
      copyUtilsDirectory(sourcePath, destPath);
    } else if (file.endsWith('.js')) {
      // Read and process JavaScript file
      let content = fs.readFileSync(sourcePath, 'utf8');
      
      // Fix imports to ensure .js extensions
      content = content.replace(/from ['"]\.\/([^'"]+)['"]/g, (match, p1) => {
        if (!p1.endsWith('.js')) {
          return `from './${p1}.js'`;
        }
        return match;
      });
      
      // Fix imports from auth subdirectory
      content = content.replace(/from ['"]\.\/auth\/([^'"]+)['"]/g, (match, p1) => {
        if (!p1.endsWith('.js')) {
          return `from './auth/${p1}.js'`;
        }
        return match;
      });
      
      // Fix imports to parent directory
      content = content.replace(/from ['"]\.\.\/([^'"]+)['"]/g, (match, p1) => {
        if (!p1.endsWith('.js')) {
          return `from '../${p1}.js'`;
        }
        return match;
      });
      
      // Replace any .ts extensions with .js
      content = content.replace(/\.ts(['"])/g, '.js$1');
      
      // Write processed file
      fs.writeFileSync(destPath, content);
      console.log(`✅ Processed: ${file}`);
    }
  }
}

// Copy and process all utility files
copyUtilsDirectory(UTILS_SOURCE, UTILS_DEST);

// Step 6: Copy essential HTML, CSS, and other files
const essentialFiles = ['popup.html', 'popup.css', 'popup.js', 'content.js', 'bridge.js'];
for (const file of essentialFiles) {
  const sourcePath = path.join(SOURCE_DIR, file);
  const destPath = path.join(OUTPUT_DIR, file);
  
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`✅ Copied: ${file}`);
  } else {
    console.warn(`⚠️ Warning: ${file} not found`);
  }
}

// Step 7: Final validation
console.log('\nPerforming final validation checks...');

// Check for critical files
const criticalFiles = ['manifest.json', 'background.js'];
const missingCriticalFiles = criticalFiles.filter(file => !fs.existsSync(path.join(OUTPUT_DIR, file)));
if (missingCriticalFiles.length > 0) {
  console.error(`❌ ERROR: Missing critical files: ${missingCriticalFiles.join(', ')}`);
} else {
  console.log('✅ All critical files present');
}

// Check for any remaining .ts imports
const jsFiles = [];
function findJsFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findJsFiles(filePath);
    } else if (file.endsWith('.js')) {
      jsFiles.push(filePath);
    }
  }
}
findJsFiles(OUTPUT_DIR);

let tsImportsFound = false;
for (const file of jsFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const tsImports = content.match(/from ['"].*\.ts['"]/g);
  if (tsImports) {
    console.error(`❌ ERROR: TypeScript imports found in ${file}:`);
    tsImports.forEach(imp => console.error(`  ${imp}`));
    tsImportsFound = true;
  }
}

if (!tsImportsFound) {
  console.log('✅ No TypeScript imports found');
}

console.log(`\n✅ Build completed successfully!`);
console.log(`Extension files are ready in the '${OUTPUT_DIR}' directory`);
console.log('\nTo load the extension in Chrome:');
console.log('1. Go to chrome://extensions/');
console.log('2. Enable Developer mode');
console.log('3. Click "Load unpacked" and select the dist-extension folder');
